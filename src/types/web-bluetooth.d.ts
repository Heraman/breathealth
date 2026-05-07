interface Navigator {
  bluetooth: {
    requestDevice(options: any): Promise<any>;
  };
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  readValue(): Promise<DataView>;
  value?: DataView;
}
