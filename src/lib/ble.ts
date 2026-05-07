const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHAR_UUID = "abcd1234-5678-1234-5678-abcdef123456";

export async function connectBreathDevice(
  onData: (value: string) => void
) {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth tidak support di browser ini");
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [
      {
        namePrefix: "SmartBreathprint",
      },
    ],
    optionalServices: [SERVICE_UUID],
  });

  const server = await device.gatt?.connect();
  if (!server) throw new Error("Gagal connect ke GATT server");

  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(CHAR_UUID);

  await characteristic.startNotifications();

  characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const text = new TextDecoder().decode(value);
    onData(text);
  });

  return device;
}