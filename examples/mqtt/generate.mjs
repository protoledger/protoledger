// Создаёт запись обмена MQTT 3.1.1 и журнал действий клиента: session.pcap, actions.csv.
// Кадры собираются здесь же по спецификации MQTT Version 3.1.1 — сети и брокера не нужно.
// Результат детерминирован: повторный запуск даёт те же байты.
// Использование (из корня репозитория):  node examples/mqtt/generate.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const BROKER = { ip: [10, 30, 0, 2], port: 1883, mac: [0x02, 0, 0, 0, 0, 0x02] };
const SENSOR = { ip: [10, 30, 0, 11], port: 52100, mac: [0x02, 0, 0, 0, 0, 0x11] };

// 2026-10-06T08:00:00Z, микросекунды.
let clock = BigInt(Date.UTC(2026, 9, 6, 8, 0, 0)) * 1000n;
const tick = (us) => (clock += BigInt(us));

const records = [];
const u16 = (v) => [(v >> 8) & 0xff, v & 0xff];
const u32 = (v) => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];

function checksum(bytes) {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) sum += (bytes[i] << 8) | (bytes[i + 1] ?? 0);
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  return ~sum & 0xffff;
}

let ipId = 0x1000;
function frame(from, to, seq, ack, flags, payload = []) {
  const tcp = [...u16(from.port), ...u16(to.port), ...u32(seq), ...u32(ack), 0x50, flags, ...u16(64240), 0, 0, 0, 0, ...payload];
  const pseudo = [...from.ip, ...to.ip, 0, 6, ...u16(tcp.length), ...tcp];
  const tcpSum = checksum(pseudo);
  tcp[16] = tcpSum >> 8;
  tcp[17] = tcpSum & 0xff;
  const ip = [0x45, 0, ...u16(20 + tcp.length), ...u16(ipId++ & 0xffff), 0x40, 0, 64, 6, 0, 0, ...from.ip, ...to.ip];
  const ipSum = checksum(ip);
  ip[10] = ipSum >> 8;
  ip[11] = ipSum & 0xff;
  records.push({ ts: clock, bytes: [...to.mac, ...from.mac, 0x08, 0x00, ...ip, ...tcp] });
}

const SYN = 0x02, ACK = 0x10, PSH = 0x08, FIN = 0x01;

class Connection {
  constructor(client, isn) {
    this.client = client;
    this.seq = { c: isn, s: (isn * 7 + 0x01020304) >>> 0 };
    frame(client, BROKER, this.seq.c, 0, SYN);
    this.seq.c = (this.seq.c + 1) >>> 0;
    tick(180);
    frame(BROKER, client, this.seq.s, this.seq.c, SYN | ACK);
    this.seq.s = (this.seq.s + 1) >>> 0;
    tick(90);
    frame(client, BROKER, this.seq.c, this.seq.s, ACK);
  }

  // Сегменты одной стороны; подтверждение встречной стороны уходит со следующими её данными.
  send(side, ...segments) {
    const [from, to, mine, peer] = side === "c" ? [this.client, BROKER, "c", "s"] : [BROKER, this.client, "s", "c"];
    for (const [i, payload] of segments.entries()) {
      if (i > 0) tick(350);
      frame(from, to, this.seq[mine], this.seq[peer], PSH | ACK, payload);
      this.seq[mine] = (this.seq[mine] + payload.length) >>> 0;
    }
  }

  ackFromClient() {
    tick(120);
    frame(this.client, BROKER, this.seq.c, this.seq.s, ACK);
  }

  close() {
    tick(900);
    frame(this.client, BROKER, this.seq.c, this.seq.s, FIN | ACK);
    this.seq.c = (this.seq.c + 1) >>> 0;
    tick(150);
    frame(BROKER, this.client, this.seq.s, this.seq.c, FIN | ACK);
    this.seq.s = (this.seq.s + 1) >>> 0;
    tick(80);
    frame(this.client, BROKER, this.seq.c, this.seq.s, ACK);
  }
}

// Оставшаяся длина: по 7 бит в байте, младшие первыми, старший бит — «есть продолжение».
const varint = (value) => {
  const out = [];
  do {
    const byte = value & 0x7f;
    value >>= 7;
    out.push(value ? byte | 0x80 : byte);
  } while (value);
  return out;
};
const text = (s) => {
  const bytes = [...Buffer.from(s, "utf8")];
  return [...u16(bytes.length), ...bytes];
};
// Пакет: тип и флаги, оставшаяся длина, затем переменный заголовок и данные.
const packet = (type, flags, body = []) => [(type << 4) | flags, ...varint(body.length), ...body];

const journal = [];
const stamp = () => new Date(Number(clock / 1000n)).toISOString().replace("Z", String(clock % 1000n).padStart(3, "0") + "Z");
const cell = (v) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const log = (action, params, result) => journal.push([stamp(), action, params, result].map(cell).join(","));

const session = new Connection(SENSOR, 0x51c40000);
// Действие клиента: запись в журнал, пакет и, если брокер отвечает, его ответ.
const act = (action, params, result, request, reply, { split = 0 } = {}) => {
  tick(380_000);
  log(action, params, result);
  tick(900);
  if (split) session.send("c", request.slice(0, split), request.slice(split));
  else session.send("c", request);
  if (reply) {
    tick(1_700);
    session.send("s", reply);
    session.ackFromClient();
  }
};

let packetId = 1;
act(
  "connect",
  { client_id: "sensor-17", keepalive: 60 },
  { code: 0 },
  packet(1, 0, [...text("MQTT"), 4, 0x02, ...u16(60), ...text("sensor-17")]),
  packet(2, 0, [0, 0]),
);
for (const topic of ["plant/line-2/cmd/#", "plant/line-2/config"]) {
  act(
    "subscribe",
    { topic, packet_id: packetId },
    { granted_qos: 1 },
    packet(8, 2, [...u16(packetId), ...text(topic), 1]),
    packet(9, 0, [...u16(packetId), 1]),
  );
  packetId += 1;
}
// Измерения без подтверждения доставки: брокер на них не отвечает.
for (const [topic, value] of [
  ["plant/line-2/temperature", "21.5"],
  ["plant/line-2/pressure", "4.82"],
  ["plant/line-2/temperature", "21.7"],
  ["plant/line-2/state", "RUN"],
]) {
  act("publish", { topic, value, qos: 0 }, { status: "sent" }, packet(3, 0, [...text(topic), ...Buffer.from(value)]));
}
// События с подтверждением: у пакета есть номер, брокер возвращает его в PUBACK.
for (const [topic, value] of [
  ["plant/line-2/alarm", "overheat"],
  ["plant/line-2/alarm", "cleared"],
  ["plant/line-2/counter", "1024"],
]) {
  act(
    "publish",
    { topic, value, qos: 1, packet_id: packetId },
    { status: "acknowledged" },
    packet(3, 2, [...text(topic), ...u16(packetId), ...Buffer.from(value)]),
    packet(4, 0, [...u16(packetId)]),
  );
  packetId += 1;
}
// Длинное сообщение: оставшаяся длина занимает два байта, сам пакет приходит двумя сегментами.
const report = JSON.stringify({
  line: 2,
  firmware: "2.4.1",
  sensors: ["temperature", "pressure", "state", "counter"],
  thresholds: { temperature: 85.0, pressure: 6.5 },
  note: "ежесменный отчёт: все датчики на связи, превышений порогов не было",
});
act(
  "publish",
  { topic: "plant/line-2/report", value: report, qos: 1, packet_id: packetId },
  { status: "acknowledged" },
  packet(3, 2, [...text("plant/line-2/report"), ...u16(packetId), ...Buffer.from(report)]),
  packet(4, 0, [...u16(packetId)]),
  { split: 90 },
);
packetId += 1;
// Команда от брокера: клиент её не запрашивал. Пауза длиннее окна, в котором сообщению
// подбирается действие из журнала: иначе команде досталось бы чужое действие клиента.
tick(2_600_000);
session.send("s", packet(3, 0, [...text("plant/line-2/cmd/setpoint"), ...Buffer.from("22.0")]));
session.ackFromClient();
act("ping", {}, { status: "pong" }, packet(12, 0), packet(13, 0));
act("publish", { topic: "plant/line-2/temperature", value: "22.0", qos: 0 }, { status: "sent" }, packet(3, 0, [...text("plant/line-2/temperature"), ...Buffer.from("22.0")]));
act("ping", {}, { status: "pong" }, packet(12, 0), packet(13, 0));
act("disconnect", {}, { status: "closed" }, packet(14, 0));
session.close();

const header = Buffer.alloc(24);
header.writeUInt32LE(0xa1b2c3d4, 0);
header.writeUInt16LE(2, 4);
header.writeUInt16LE(4, 6);
header.writeUInt32LE(65535, 16);
header.writeUInt32LE(1, 20);
const parts = [header];
for (const r of records) {
  const h = Buffer.alloc(16);
  h.writeUInt32LE(Number(r.ts / 1_000_000n), 0);
  h.writeUInt32LE(Number(r.ts % 1_000_000n), 4);
  h.writeUInt32LE(r.bytes.length, 8);
  h.writeUInt32LE(r.bytes.length, 12);
  parts.push(h, Buffer.from(r.bytes));
}
fs.writeFileSync(path.join(here, "session.pcap"), Buffer.concat(parts));
fs.writeFileSync(path.join(here, "actions.csv"), ["time,action,params,result", ...journal].join("\n") + "\n");
console.log(`кадров: ${records.length}, действий: ${journal.length}`);
