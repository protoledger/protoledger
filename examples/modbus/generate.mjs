// Создаёт запись обмена Modbus/TCP и журнал действий: session.pcap, actions.csv.
// Кадры собираются здесь же по спецификации Modbus Application Protocol 1.1b3 — сети и устройства не нужно.
// Результат детерминирован: повторный запуск даёт те же байты.
// Использование (из корня репозитория):  node examples/modbus/generate.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const DEVICE = { ip: [10, 20, 0, 20], port: 502, mac: [0x02, 0, 0, 0, 0, 0x20] };
const PANEL = { ip: [10, 20, 0, 5], port: 49152, mac: [0x02, 0, 0, 0, 0, 0x05] };
const STATION = { ip: [10, 20, 0, 7], port: 49731, mac: [0x02, 0, 0, 0, 0, 0x07] };

// 2026-10-05T09:00:00Z, микросекунды.
let clock = BigInt(Date.UTC(2026, 9, 5, 9, 0, 0)) * 1000n;
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
    frame(client, DEVICE, this.seq.c, 0, SYN);
    this.seq.c = (this.seq.c + 1) >>> 0;
    tick(180);
    frame(DEVICE, client, this.seq.s, this.seq.c, SYN | ACK);
    this.seq.s = (this.seq.s + 1) >>> 0;
    tick(90);
    frame(client, DEVICE, this.seq.c, this.seq.s, ACK);
  }

  // Сегменты одной стороны; подтверждение встречной стороны уходит со следующими её данными.
  send(side, ...segments) {
    const [from, to, mine, peer] = side === "c" ? [this.client, DEVICE, "c", "s"] : [DEVICE, this.client, "s", "c"];
    for (const [i, payload] of segments.entries()) {
      if (i > 0) tick(350);
      frame(from, to, this.seq[mine], this.seq[peer], PSH | ACK, payload);
      this.seq[mine] = (this.seq[mine] + payload.length) >>> 0;
    }
  }

  ackFromClient() {
    tick(120);
    frame(this.client, DEVICE, this.seq.c, this.seq.s, ACK);
  }

  close() {
    tick(900);
    frame(this.client, DEVICE, this.seq.c, this.seq.s, FIN | ACK);
    this.seq.c = (this.seq.c + 1) >>> 0;
    tick(150);
    frame(DEVICE, this.client, this.seq.s, this.seq.c, FIN | ACK);
    this.seq.s = (this.seq.s + 1) >>> 0;
    tick(80);
    frame(this.client, DEVICE, this.seq.c, this.seq.s, ACK);
  }
}

// Заголовок MBAP: номер транзакции, протокол 0, длина остатка, адрес устройства; затем код функции и данные.
const adu = (transaction, unit, pdu) => [...u16(transaction), 0, 0, ...u16(pdu.length + 1), unit, ...pdu];

// Память устройства: регистры хранения, входные регистры, катушки, дискретные входы.
const device = {
  holding: new Map([[0, 2150], [1, 450], [2, 1000], [3, 1]]),
  input: (address, step) => (address === 100 ? 2143 + step * 3 : 5012 - step * 7),
  coils: new Map([[0, 1], [1, 0], [2, 1], [3, 0], [4, 0], [5, 1], [6, 0], [7, 0], [8, 1], [9, 1]]),
  discrete: (step) => 0b10100101 ^ (step & 1),
};
const pack = (bits) => {
  const out = new Array(Math.ceil(bits.length / 8)).fill(0);
  bits.forEach((b, i) => (out[i >> 3] |= b << (i & 7)));
  return out;
};

function respond(pdu, step) {
  const fn = pdu[0];
  const address = (pdu[1] << 8) | pdu[2];
  const count = (pdu[3] << 8) | pdu[4];
  const refuse = (code) => [fn | 0x80, code];
  switch (fn) {
    case 1: {
      const bits = pack(Array.from({ length: count }, (_, i) => device.coils.get(address + i) ?? 0));
      return [fn, bits.length, ...bits];
    }
    case 2:
      return [fn, 1, device.discrete(step)];
    case 3: {
      if (address + count > 64) return refuse(2);
      const values = Array.from({ length: count }, (_, i) => device.holding.get(address + i) ?? 0);
      return [fn, count * 2, ...values.flatMap(u16)];
    }
    case 4: {
      const values = Array.from({ length: count }, (_, i) => device.input(address + i, step));
      return [fn, count * 2, ...values.flatMap(u16)];
    }
    case 5:
      device.coils.set(address, count === 0xff00 ? 1 : 0);
      return pdu;
    case 6:
      if (count > 5000) return refuse(3);
      device.holding.set(address, count);
      return pdu;
    case 15: {
      for (let i = 0; i < count; i++) device.coils.set(address + i, (pdu[6 + (i >> 3)] >> (i & 7)) & 1);
      return pdu.slice(0, 5);
    }
    case 16: {
      for (let i = 0; i < count; i++) device.holding.set(address + i, (pdu[6 + i * 2] << 8) | pdu[7 + i * 2]);
      return pdu.slice(0, 5);
    }
    case 0x2b:
      // Сведения об устройстве: объект 0 «ACME», объект 1 «TC-20».
      return [fn, 0x0e, 0x01, 0x01, 0x00, 0x00, 0x02, 0x00, 0x04, ...Buffer.from("ACME"), 0x01, 0x05, ...Buffer.from("TC-20")];
    default:
      return refuse(1);
  }
}

const journal = [];
const stamp = () => new Date(Number(clock / 1000n)).toISOString().replace("Z", String(clock % 1000n).padStart(3, "0") + "Z");
const cell = (v) => {
  const text = typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const log = (action, params, result) => journal.push([stamp(), action, params, result].map(cell).join(","));

function outcome(reply) {
  if (reply[0] & 0x80) return { status: "exception", code: reply[1] };
  const words = () => Array.from({ length: reply[1] / 2 }, (_, i) => (reply[2 + i * 2] << 8) | reply[3 + i * 2]);
  if (reply[0] === 3 || reply[0] === 4) return { status: "ok", values: words() };
  if (reply[0] === 1 || reply[0] === 2) return { status: "ok", bits: reply.slice(2) };
  return { status: "ok" };
}

// 1. Панель оператора: циклический опрос, без журнала.
{
  const panel = new Connection(PANEL, 0x3a5b0000);
  let transaction = 1;
  for (let step = 0; step < 5; step++) {
    for (const pdu of [[3, ...u16(0), ...u16(4)], [4, ...u16(100), ...u16(2)], [1, ...u16(0), ...u16(10)], [2, ...u16(0), ...u16(8)]]) {
      tick(40_000);
      panel.send("c", adu(transaction, 1, pdu));
      tick(2_300);
      panel.send("s", adu(transaction++, 1, respond(pdu, step)));
      panel.ackFromClient();
    }
    tick(340_000);
  }
  panel.close();
}

// 2. Инженерная станция: действия оператора, каждое записано в журнал.
tick(6_000_000);
{
  const station = new Connection(STATION, 0x7c110000);
  let transaction = 0x0100;
  const act = (action, params, pdu, { split = 0 } = {}) => {
    tick(450_000);
    const reply = respond(pdu, 5);
    log(action, params, outcome(reply));
    tick(1_200);
    station.send("c", adu(transaction, 1, pdu));
    tick(2_600);
    const answer = adu(transaction++, 1, reply);
    // Ответ может прийти двумя сегментами: границы сообщений не совпадают с границами пакетов.
    if (split) station.send("s", answer.slice(0, split), answer.slice(split));
    else station.send("s", answer);
    station.ackFromClient();
  };

  act("read_holding", { address: 0, count: 4 }, [3, ...u16(0), ...u16(4)]);
  act("write_register", { address: 1, value: 475 }, [6, ...u16(1), ...u16(475)]);
  act("write_register", { address: 2, value: 1500 }, [6, ...u16(2), ...u16(1500)]);
  act("read_holding", { address: 0, count: 4 }, [3, ...u16(0), ...u16(4)], { split: 9 });
  act("write_coil", { address: 3, on: 1 }, [5, ...u16(3), ...u16(0xff00)]);
  act("write_coil", { address: 0, on: 0 }, [5, ...u16(0), ...u16(0)]);
  act("read_coils", { address: 0, count: 10 }, [1, ...u16(0), ...u16(10)]);
  act("write_registers", { address: 0, count: 3 }, [16, ...u16(0), ...u16(3), 6, ...u16(2200), ...u16(500), ...u16(2000)]);
  act("read_holding", { address: 0, count: 3 }, [3, ...u16(0), ...u16(3)]);
  act("write_coils", { address: 4, count: 6 }, [15, ...u16(4), ...u16(6), 1, 0b00101101]);
  act("read_input", { address: 100, count: 2 }, [4, ...u16(100), ...u16(2)]);
  act("read_holding", { address: 9000, count: 2 }, [3, ...u16(9000), ...u16(2)]);
  act("write_register", { address: 1, value: 9999 }, [6, ...u16(1), ...u16(9999)]);
  act("device_info", {}, [0x2b, 0x0e, 0x01, 0x00]);

  // Два запроса одним сегментом — два сообщения в одном пакете.
  tick(450_000);
  const first = [3, ...u16(1), ...u16(1)];
  const second = [4, ...u16(101), ...u16(1)];
  log("read_holding", { address: 1, count: 1 }, outcome(respond(first, 5)));
  log("read_input", { address: 101, count: 1 }, outcome(respond(second, 5)));
  tick(1_200);
  station.send("c", [...adu(transaction, 1, first), ...adu(transaction + 1, 1, second)]);
  tick(2_900);
  station.send("s", adu(transaction, 1, respond(first, 5)));
  tick(700);
  station.send("s", adu(transaction + 1, 1, respond(second, 5)));
  station.ackFromClient();
  station.close();
}

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
