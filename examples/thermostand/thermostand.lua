-- Диссектор Wireshark, выгруженный из описания протокола protoledger.
-- Положите файл в папку личных плагинов Wireshark или запустите: tshark -X lua_script:<файл> -r <запись>.
-- Переносится разбор сообщений и полей; проверки и гипотезы остаются в описании.

local proto = Proto("thermostand", "thermostand (protoledger)")
local F = {}
F[""] = ProtoField.string("thermostand.message", "message")
F["read_config_req.signature"] = ProtoField.bytes("thermostand.read_config_req.signature", "signature")
F["read_config_req.length"] = ProtoField.uint16("thermostand.read_config_req.length", "length", base.DEC)
F["read_config_req.seq"] = ProtoField.uint16("thermostand.read_config_req.seq", "seq", base.DEC)
F["read_config_req.dir"] = ProtoField.uint8("thermostand.read_config_req.dir", "dir", base.DEC)
F["read_config_req.cmd"] = ProtoField.uint8("thermostand.read_config_req.cmd", "cmd", base.DEC)
F["set_config_req.signature"] = ProtoField.bytes("thermostand.set_config_req.signature", "signature")
F["set_config_req.length"] = ProtoField.uint16("thermostand.set_config_req.length", "length", base.DEC)
F["set_config_req.seq"] = ProtoField.uint16("thermostand.set_config_req.seq", "seq", base.DEC)
F["set_config_req.dir"] = ProtoField.uint8("thermostand.set_config_req.dir", "dir", base.DEC)
F["set_config_req.cmd"] = ProtoField.uint8("thermostand.set_config_req.cmd", "cmd", base.DEC)
F["set_config_req.enabled"] = ProtoField.uint8("thermostand.set_config_req.enabled", "enabled", base.DEC)
F["set_config_req.period_ms"] = ProtoField.uint16("thermostand.set_config_req.period_ms", "period_ms", base.DEC)
F["set_config_req.threshold_centi_c"] = ProtoField.int16("thermostand.set_config_req.threshold_centi_c", "threshold_centi_c", base.DEC)
F["set_config_req.label_len"] = ProtoField.uint8("thermostand.set_config_req.label_len", "label_len", base.DEC)
F["set_config_req.label"] = ProtoField.string("thermostand.set_config_req.label", "label")
F["read_values_req.signature"] = ProtoField.bytes("thermostand.read_values_req.signature", "signature")
F["read_values_req.length"] = ProtoField.uint16("thermostand.read_values_req.length", "length", base.DEC)
F["read_values_req.seq"] = ProtoField.uint16("thermostand.read_values_req.seq", "seq", base.DEC)
F["read_values_req.dir"] = ProtoField.uint8("thermostand.read_values_req.dir", "dir", base.DEC)
F["read_values_req.cmd"] = ProtoField.uint8("thermostand.read_values_req.cmd", "cmd", base.DEC)
F["read_values_req.count"] = ProtoField.uint8("thermostand.read_values_req.count", "count", base.DEC)
F["unknown_command_req.signature"] = ProtoField.bytes("thermostand.unknown_command_req.signature", "signature")
F["unknown_command_req.length"] = ProtoField.uint16("thermostand.unknown_command_req.length", "length", base.DEC)
F["unknown_command_req.seq"] = ProtoField.uint16("thermostand.unknown_command_req.seq", "seq", base.DEC)
F["unknown_command_req.dir"] = ProtoField.uint8("thermostand.unknown_command_req.dir", "dir", base.DEC)
F["unknown_command_req.cmd"] = ProtoField.uint8("thermostand.unknown_command_req.cmd", "cmd", base.DEC)
F["unknown_command_req.body"] = ProtoField.bytes("thermostand.unknown_command_req.body", "body")
F["config_resp.signature"] = ProtoField.bytes("thermostand.config_resp.signature", "signature")
F["config_resp.length"] = ProtoField.uint16("thermostand.config_resp.length", "length", base.DEC)
F["config_resp.seq"] = ProtoField.uint16("thermostand.config_resp.seq", "seq", base.DEC)
F["config_resp.dir"] = ProtoField.uint8("thermostand.config_resp.dir", "dir", base.DEC)
F["config_resp.cmd"] = ProtoField.uint8("thermostand.config_resp.cmd", "cmd", base.DEC)
F["config_resp.status"] = ProtoField.uint8("thermostand.config_resp.status", "status", base.DEC)
F["config_resp.enabled"] = ProtoField.uint8("thermostand.config_resp.enabled", "enabled", base.DEC)
F["config_resp.period_ms"] = ProtoField.uint16("thermostand.config_resp.period_ms", "period_ms", base.DEC)
F["config_resp.threshold_centi_c"] = ProtoField.int16("thermostand.config_resp.threshold_centi_c", "threshold_centi_c", base.DEC)
F["config_resp.label_len"] = ProtoField.uint8("thermostand.config_resp.label_len", "label_len", base.DEC)
F["config_resp.label"] = ProtoField.string("thermostand.config_resp.label", "label")
F["values_resp.signature"] = ProtoField.bytes("thermostand.values_resp.signature", "signature")
F["values_resp.length"] = ProtoField.uint16("thermostand.values_resp.length", "length", base.DEC)
F["values_resp.seq"] = ProtoField.uint16("thermostand.values_resp.seq", "seq", base.DEC)
F["values_resp.dir"] = ProtoField.uint8("thermostand.values_resp.dir", "dir", base.DEC)
F["values_resp.cmd"] = ProtoField.uint8("thermostand.values_resp.cmd", "cmd", base.DEC)
F["values_resp.status"] = ProtoField.uint8("thermostand.values_resp.status", "status", base.DEC)
F["values_resp.count"] = ProtoField.uint8("thermostand.values_resp.count", "count", base.DEC)
F["values_resp.measurements.device_time_ms"] = ProtoField.uint32("thermostand.values_resp.measurements.device_time_ms", "device_time_ms", base.DEC)
F["values_resp.measurements.temperature_centi_c"] = ProtoField.int16("thermostand.values_resp.measurements.temperature_centi_c", "temperature_centi_c", base.DEC)
F["values_resp.measurements.alarm"] = ProtoField.uint8("thermostand.values_resp.measurements.alarm", "alarm", base.DEC)
F["error_resp.signature"] = ProtoField.bytes("thermostand.error_resp.signature", "signature")
F["error_resp.length"] = ProtoField.uint16("thermostand.error_resp.length", "length", base.DEC)
F["error_resp.seq"] = ProtoField.uint16("thermostand.error_resp.seq", "seq", base.DEC)
F["error_resp.dir"] = ProtoField.uint8("thermostand.error_resp.dir", "dir", base.DEC)
F["error_resp.cmd"] = ProtoField.uint8("thermostand.error_resp.cmd", "cmd", base.DEC)
F["error_resp.status"] = ProtoField.uint8("thermostand.error_resp.status", "status", base.DEC)
local list = {}
for _, f in pairs(F) do list[#list + 1] = f end
proto.fields = list
local W, D, ID = {}, {}, {}

-- Число переменного размера: по 7 бит в байте, младшие первыми; размер и значение.
local function varint(buf, at, len)
  local value, i = 0, 0
  while at and at + i < len and i < 9 do
    local b = buf(at + i, 1):uint()
    value = value + (b % 128) * 2 ^ (7 * i)
    i = i + 1
    if b < 128 then return i, value end
  end
  return nil, nil
end

-- Размер сообщения с полем длины переменного размера; nil — поле ещё не дочитано.
local function varint_length(buf, at, extra)
  local size, value = varint(buf, at, buf:len())
  if not size then return nil end
  return value + size + extra
end

ID[0] = "read_config_req"
W[0] = function(buf, pinfo, len)
  local v = {}
  if 2 + 2 <= len then local r = buf(2, 2); v["length"] = r:uint() end
  if 4 + 2 <= len then local r = buf(4, 2); v["seq"] = r:uint() end
  if 6 + 1 <= len then local r = buf(6, 1); v["dir"] = r:uint() end
  if 7 + 1 <= len then local r = buf(7, 1); v["cmd"] = r:uint() end
  return (((v["dir"] == (0)) and (v["cmd"] == (16)))) == true
end

D[0] = function(buf, sub, v, len)
  local origin, pos, at, size, value = 0, 0, nil, nil, nil
  at = origin + 0
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_config_req.signature"], r)
    end
    v["signature"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 2
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_config_req.length"], r)
      value = r:uint()
    end
    v["length"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 4
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_config_req.seq"], r)
      value = r:uint()
    end
    v["seq"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 6
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_config_req.dir"], r)
      value = r:uint()
    end
    v["dir"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 7
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_config_req.cmd"], r)
      value = r:uint()
    end
    v["cmd"] = value
    pos = at + size
  else
    pos = nil
  end
end

ID[1] = "set_config_req"
W[1] = function(buf, pinfo, len)
  local v = {}
  if 2 + 2 <= len then local r = buf(2, 2); v["length"] = r:uint() end
  if 4 + 2 <= len then local r = buf(4, 2); v["seq"] = r:uint() end
  if 6 + 1 <= len then local r = buf(6, 1); v["dir"] = r:uint() end
  if 7 + 1 <= len then local r = buf(7, 1); v["cmd"] = r:uint() end
  if 8 + 1 <= len then local r = buf(8, 1); v["enabled"] = r:uint() end
  if 9 + 2 <= len then local r = buf(9, 2); v["period_ms"] = r:uint() end
  if 11 + 2 <= len then local r = buf(11, 2); v["threshold_centi_c"] = r:int() end
  if 13 + 1 <= len then local r = buf(13, 1); v["label_len"] = r:uint() end
  return (((v["dir"] == (0)) and (v["cmd"] == (32)))) == true
end

D[1] = function(buf, sub, v, len)
  local origin, pos, at, size, value = 0, 0, nil, nil, nil
  at = origin + 0
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.signature"], r)
    end
    v["signature"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 2
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.length"], r)
      value = r:uint()
    end
    v["length"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 4
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.seq"], r)
      value = r:uint()
    end
    v["seq"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 6
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.dir"], r)
      value = r:uint()
    end
    v["dir"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 7
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.cmd"], r)
      value = r:uint()
    end
    v["cmd"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 8
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.enabled"], r)
      value = r:uint()
    end
    v["enabled"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 9
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.period_ms"], r)
      value = r:uint()
    end
    v["period_ms"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 11
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.threshold_centi_c"], r)
      value = r:int()
    end
    v["threshold_centi_c"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 13
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.label_len"], r)
      value = r:uint()
    end
    v["label_len"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 14
  size = v["label_len"]
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["set_config_req.label"], r)
      value = r:string()
    end
    v["label"] = value
    pos = at + size
  else
    pos = nil
  end
end

ID[2] = "read_values_req"
W[2] = function(buf, pinfo, len)
  local v = {}
  if 2 + 2 <= len then local r = buf(2, 2); v["length"] = r:uint() end
  if 4 + 2 <= len then local r = buf(4, 2); v["seq"] = r:uint() end
  if 6 + 1 <= len then local r = buf(6, 1); v["dir"] = r:uint() end
  if 7 + 1 <= len then local r = buf(7, 1); v["cmd"] = r:uint() end
  if 8 + 1 <= len then local r = buf(8, 1); v["count"] = r:uint() end
  return (((v["dir"] == (0)) and (v["cmd"] == (48)))) == true
end

D[2] = function(buf, sub, v, len)
  local origin, pos, at, size, value = 0, 0, nil, nil, nil
  at = origin + 0
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_values_req.signature"], r)
    end
    v["signature"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 2
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_values_req.length"], r)
      value = r:uint()
    end
    v["length"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 4
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_values_req.seq"], r)
      value = r:uint()
    end
    v["seq"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 6
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_values_req.dir"], r)
      value = r:uint()
    end
    v["dir"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 7
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_values_req.cmd"], r)
      value = r:uint()
    end
    v["cmd"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 8
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["read_values_req.count"], r)
      value = r:uint()
    end
    v["count"] = value
    pos = at + size
  else
    pos = nil
  end
end

ID[3] = "unknown_command_req"
W[3] = function(buf, pinfo, len)
  local v = {}
  if 2 + 2 <= len then local r = buf(2, 2); v["length"] = r:uint() end
  if 4 + 2 <= len then local r = buf(4, 2); v["seq"] = r:uint() end
  if 6 + 1 <= len then local r = buf(6, 1); v["dir"] = r:uint() end
  if 7 + 1 <= len then local r = buf(7, 1); v["cmd"] = r:uint() end
  return (((((v["dir"] == (0)) and (v["cmd"] ~= (16))) and (v["cmd"] ~= (32))) and (v["cmd"] ~= (48)))) == true
end

D[3] = function(buf, sub, v, len)
  local origin, pos, at, size, value = 0, 0, nil, nil, nil
  at = origin + 0
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["unknown_command_req.signature"], r)
    end
    v["signature"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 2
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["unknown_command_req.length"], r)
      value = r:uint()
    end
    v["length"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 4
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["unknown_command_req.seq"], r)
      value = r:uint()
    end
    v["seq"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 6
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["unknown_command_req.dir"], r)
      value = r:uint()
    end
    v["dir"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 7
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["unknown_command_req.cmd"], r)
      value = r:uint()
    end
    v["cmd"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 8
  size = v["length"]
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["unknown_command_req.body"], r)
    end
    v["body"] = value
    pos = at + size
  else
    pos = nil
  end
end

ID[4] = "config_resp"
W[4] = function(buf, pinfo, len)
  local v = {}
  if 2 + 2 <= len then local r = buf(2, 2); v["length"] = r:uint() end
  if 4 + 2 <= len then local r = buf(4, 2); v["seq"] = r:uint() end
  if 6 + 1 <= len then local r = buf(6, 1); v["dir"] = r:uint() end
  if 7 + 1 <= len then local r = buf(7, 1); v["cmd"] = r:uint() end
  if 8 + 1 <= len then local r = buf(8, 1); v["status"] = r:uint() end
  if 9 + 1 <= len then local r = buf(9, 1); v["enabled"] = r:uint() end
  if 10 + 2 <= len then local r = buf(10, 2); v["period_ms"] = r:uint() end
  if 12 + 2 <= len then local r = buf(12, 2); v["threshold_centi_c"] = r:int() end
  if 14 + 1 <= len then local r = buf(14, 1); v["label_len"] = r:uint() end
  return ((((v["dir"] == (1)) and ((v["cmd"] == (16)) or (v["cmd"] == (32)))) and (v["status"] == (0)))) == true
end

D[4] = function(buf, sub, v, len)
  local origin, pos, at, size, value = 0, 0, nil, nil, nil
  at = origin + 0
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.signature"], r)
    end
    v["signature"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 2
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.length"], r)
      value = r:uint()
    end
    v["length"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 4
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.seq"], r)
      value = r:uint()
    end
    v["seq"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 6
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.dir"], r)
      value = r:uint()
    end
    v["dir"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 7
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.cmd"], r)
      value = r:uint()
    end
    v["cmd"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 8
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.status"], r)
      value = r:uint()
    end
    v["status"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 9
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.enabled"], r)
      value = r:uint()
    end
    v["enabled"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 10
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.period_ms"], r)
      value = r:uint()
    end
    v["period_ms"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 12
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.threshold_centi_c"], r)
      value = r:int()
    end
    v["threshold_centi_c"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 14
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.label_len"], r)
      value = r:uint()
    end
    v["label_len"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 15
  size = v["label_len"]
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["config_resp.label"], r)
      value = r:string()
    end
    v["label"] = value
    pos = at + size
  else
    pos = nil
  end
end

ID[5] = "values_resp"
W[5] = function(buf, pinfo, len)
  local v = {}
  if 2 + 2 <= len then local r = buf(2, 2); v["length"] = r:uint() end
  if 4 + 2 <= len then local r = buf(4, 2); v["seq"] = r:uint() end
  if 6 + 1 <= len then local r = buf(6, 1); v["dir"] = r:uint() end
  if 7 + 1 <= len then local r = buf(7, 1); v["cmd"] = r:uint() end
  if 8 + 1 <= len then local r = buf(8, 1); v["status"] = r:uint() end
  if 9 + 1 <= len then local r = buf(9, 1); v["count"] = r:uint() end
  return ((((v["dir"] == (1)) and (v["cmd"] == (48))) and (v["status"] == (0)))) == true
end

D[5] = function(buf, sub, v, len)
  local origin, pos, at, size, value = 0, 0, nil, nil, nil
  at = origin + 0
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["values_resp.signature"], r)
    end
    v["signature"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 2
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["values_resp.length"], r)
      value = r:uint()
    end
    v["length"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 4
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["values_resp.seq"], r)
      value = r:uint()
    end
    v["seq"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 6
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["values_resp.dir"], r)
      value = r:uint()
    end
    v["dir"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 7
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["values_resp.cmd"], r)
      value = r:uint()
    end
    v["cmd"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 8
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["values_resp.status"], r)
      value = r:uint()
    end
    v["status"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 9
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["values_resp.count"], r)
      value = r:uint()
    end
    v["count"] = value
    pos = at + size
  else
    pos = nil
  end
  local first, count = 10, v["count"]
  pos = nil
  if first and type(count) == "number" and count >= 0 and first + count * 7 <= len then
    for i = 0, count - 1 do
      origin = first + i * 7
      at = origin + 0
      size = 4
      value = nil
      if at and size and at >= 0 and size >= 0 and at + size <= len then
        if size > 0 then
          local r = buf(at, size)
          sub:add(F["values_resp.measurements.device_time_ms"], r)
          value = r:uint()
        end
        v["measurements." .. i .. ".device_time_ms"] = value
        pos = at + size
      else
        pos = nil
      end
      at = origin + 4
      size = 2
      value = nil
      if at and size and at >= 0 and size >= 0 and at + size <= len then
        if size > 0 then
          local r = buf(at, size)
          sub:add(F["values_resp.measurements.temperature_centi_c"], r)
          value = r:int()
        end
        v["measurements." .. i .. ".temperature_centi_c"] = value
        pos = at + size
      else
        pos = nil
      end
      at = origin + 6
      size = 1
      value = nil
      if at and size and at >= 0 and size >= 0 and at + size <= len then
        if size > 0 then
          local r = buf(at, size)
          sub:add(F["values_resp.measurements.alarm"], r)
          value = r:uint()
        end
        v["measurements." .. i .. ".alarm"] = value
        pos = at + size
      else
        pos = nil
      end
    end
    origin = 0
    pos = first + count * 7
  end
end

ID[6] = "error_resp"
W[6] = function(buf, pinfo, len)
  local v = {}
  if 2 + 2 <= len then local r = buf(2, 2); v["length"] = r:uint() end
  if 4 + 2 <= len then local r = buf(4, 2); v["seq"] = r:uint() end
  if 6 + 1 <= len then local r = buf(6, 1); v["dir"] = r:uint() end
  if 7 + 1 <= len then local r = buf(7, 1); v["cmd"] = r:uint() end
  if 8 + 1 <= len then local r = buf(8, 1); v["status"] = r:uint() end
  return (((v["dir"] == (1)) and (v["status"] ~= (0)))) == true
end

D[6] = function(buf, sub, v, len)
  local origin, pos, at, size, value = 0, 0, nil, nil, nil
  at = origin + 0
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["error_resp.signature"], r)
    end
    v["signature"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 2
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["error_resp.length"], r)
      value = r:uint()
    end
    v["length"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 4
  size = 2
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["error_resp.seq"], r)
      value = r:uint()
    end
    v["seq"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 6
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["error_resp.dir"], r)
      value = r:uint()
    end
    v["dir"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 7
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["error_resp.cmd"], r)
      value = r:uint()
    end
    v["cmd"] = value
    pos = at + size
  else
    pos = nil
  end
  at = origin + 8
  size = 1
  value = nil
  if at and size and at >= 0 and size >= 0 and at + size <= len then
    if size > 0 then
      local r = buf(at, size)
      sub:add(F["error_resp.status"], r)
      value = r:uint()
    end
    v["status"] = value
    pos = at + size
  else
    pos = nil
  end
end

local function dissect_message(buf, pinfo, tree)
  local len = buf:len()
  pinfo.cols.protocol = "thermostand"
  local sub = tree:add(proto, buf())
  for i = 0, 6 do
    if select(2, pcall(W[i], buf, pinfo, len)) == true then
      sub:add(F[""], buf(), ID[i])
      sub:append_text(": " .. ID[i])
      pcall(D[i], buf, sub, {}, len)
      break
    end
  end
  return len
end

local function message_length(buf, pinfo, offset)
  local total = buf(offset + 2, 2):uint() + (8)
  if not total then return 0 end
  if total < 4 then return 4 end
  return total
end

function proto.dissector(buf, pinfo, tree)
  dissect_tcp_pdus(buf, tree, 4, message_length, dissect_message)
  return buf:len()
end

local tcp = DissectorTable.get("tcp.port")
tcp:add(46123, proto)

-- Полей со статусом «гипотеза» или «неизвестно» в описании: 38. Диссектор показывает разбор, а не доказывает его.
