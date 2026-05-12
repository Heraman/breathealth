const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHAR_UUID = "abcd1234-5678-1234-5678-abcdef123456";

// Simpan referensi device & characteristic aktif di module-level
// supaya bisa di-disconnect dari mana saja
let activeDevice: BluetoothDevice | null = null;
let activeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

/**
 * Putuskan koneksi Bluetooth aktif dan reset semua referensi.
 * Aman dipanggil meski belum ada koneksi (no-op).
 */
export async function disconnectBreathDevice() {
  // Hentikan notifikasi dulu sebelum disconnect agar tidak error
  if (activeCharacteristic) {
    try {
      await activeCharacteristic.stopNotifications();
    } catch (_) {
      // Abaikan error jika sudah tidak terhubung
    }
    activeCharacteristic = null;
  }

  if (activeDevice) {
    // Hapus semua listener agar event 'gattserverdisconnected' tidak
    // terpanggil lagi setelah kita yang sengaja disconnect
    activeDevice.removeEventListener("gattserverdisconnected", handleUnexpectedDisconnect);

    if (activeDevice.gatt?.connected) {
      activeDevice.gatt.disconnect();
    }
    activeDevice = null;
  }
}

// Handler disconnect tak terduga — disimpan sebagai named function
// agar bisa dihapus lewat removeEventListener
let _onDisconnectCallback: (() => void) | null = null;
function handleUnexpectedDisconnect() {
  console.log("Device disconnected unexpectedly!");
  // Reset referensi supaya koneksi berikutnya bersih
  activeCharacteristic = null;
  activeDevice = null;
  _onDisconnectCallback?.();
}

export async function connectBreathDevice(
  onData: (value: string) => void,
  onDisconnect: () => void
) {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth tidak support di browser ini");
  }

  // Putuskan koneksi lama dulu jika masih ada
  // Ini mencegah error "GATT operation already in progress"
  await disconnectBreathDevice();

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: "SmartBreathprint" }],
    optionalServices: [SERVICE_UUID],
  });

  // Simpan callback & pasang listener
  _onDisconnectCallback = onDisconnect;
  device.addEventListener("gattserverdisconnected", handleUnexpectedDisconnect);

  const server = await device.gatt?.connect();
  if (!server) throw new Error("Gagal connect ke GATT server");

  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(CHAR_UUID);

  await characteristic.startNotifications();

  characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const text = new TextDecoder().decode(value).trim();
    onData(text);
  });

  // Simpan referensi aktif
  activeDevice = device;
  activeCharacteristic = characteristic;

  return device;
}