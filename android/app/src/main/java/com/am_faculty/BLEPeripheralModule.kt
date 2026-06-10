package com.am_faculty

import android.bluetooth.*
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

class BLEPeripheralModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "BLEPeripheralModule"
    private var bluetoothManager: BluetoothManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeAdvertiser: android.bluetooth.le.BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null

    private var facultyToStudentChar: BluetoothGattCharacteristic? = null
    private var studentToFacultyChar: BluetoothGattCharacteristic? = null

    private val connectedDevices = mutableMapOf<String, BluetoothDevice>()

    override fun getName(): String = "BLEPeripheralModule"

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            bluetoothAdapter = bluetoothManager?.adapter
            
            if (bluetoothAdapter == null) {
                promise.reject("BT_NOT_SUPPORTED", "Bluetooth not supported on this device")
                return
            }

            if (!bluetoothAdapter!!.isEnabled) {
                promise.reject("BT_DISABLED", "Bluetooth is disabled")
                return
            }

            bluetoothLeAdvertiser = bluetoothAdapter!!.bluetoothLeAdvertiser
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun startAdvertising(serviceUuid: String, facToStuUuid: String, stuToFacUuid: String, payload: String, promise: Promise) {
        try {
            val sUuid = UUID.fromString(serviceUuid)
            val f2sUuid = UUID.fromString(facToStuUuid)
            val s2fUuid = UUID.fromString(stuToFacUuid)

            // 1. Setup GATT Server
            val gattCallback = object : BluetoothGattServerCallback() {
                override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        connectedDevices[device.address] = device
                        Log.d(TAG, "Device connected: ${device.address}")
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        connectedDevices.remove(device.address)
                        val params = Arguments.createMap()
                        params.putString("address", device.address)
                        sendEvent("onClientDisconnected", params)
                        Log.d(TAG, "Device disconnected: ${device.address}")
                    }
                }

                override fun onCharacteristicWriteRequest(
                    device: BluetoothDevice,
                    requestId: Int,
                    characteristic: BluetoothGattCharacteristic,
                    preparedWrite: Boolean,
                    responseNeeded: Boolean,
                    offset: Int,
                    value: ByteArray
                ) {
                    val message = String(value)
                    Log.d(TAG, "Write request from ${device.address}: $message")
                    
                    val params = Arguments.createMap()
                    params.putString("message", message)
                    params.putString("address", device.address)
                    sendEvent("onStudentMessage", params)

                    if (responseNeeded) {
                        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
                    }
                }

                override fun onDescriptorWriteRequest(
                    device: BluetoothDevice,
                    requestId: Int,
                    descriptor: BluetoothGattDescriptor,
                    preparedWrite: Boolean,
                    responseNeeded: Boolean,
                    offset: Int,
                    value: ByteArray
                ) {
                    Log.d(TAG, "Descriptor write request from ${device.address}")
                    if (responseNeeded) {
                        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
                    }
                }
            }

            gattServer = bluetoothManager?.openGattServer(reactApplicationContext, gattCallback)
            
            val service = BluetoothGattService(sUuid, BluetoothGattService.SERVICE_TYPE_PRIMARY)
            
            // Faculty -> Student (Notify)
            facultyToStudentChar = BluetoothGattCharacteristic(
                f2sUuid,
                BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_READ
            ).apply {
                // Add CCCD descriptor to allow clients to subscribe to notifications
                val cccd = BluetoothGattDescriptor(
                    UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"),
                    BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
                )
                addDescriptor(cccd)
            }
            
            // Student -> Faculty (Write)
            studentToFacultyChar = BluetoothGattCharacteristic(
                s2fUuid,
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            )

            service.addCharacteristic(facultyToStudentChar)
            service.addCharacteristic(studentToFacultyChar)
            gattServer?.addService(service)

            // 2. Start Advertising
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setConnectable(true)
                .setTimeout(0)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .build()

            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceUuid(ParcelUuid(sUuid))
                .build()

            val scanResponse = AdvertiseData.Builder()
                .addServiceData(ParcelUuid(sUuid), payload.toByteArray())
                .build()

            bluetoothLeAdvertiser?.startAdvertising(settings, data, scanResponse, advertiseCallback)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ADVERTISE_ERROR", e.message)
        }
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            Log.d(TAG, "BLE Advertising started successfully")
        }

        override fun onStartFailure(errorCode: Int) {
            Log.e(TAG, "BLE Advertising failed with error code: $errorCode")
            val params = Arguments.createMap()
            params.putInt("errorCode", errorCode)
            sendEvent("onAdvertisingFailure", params)
        }
    }

    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
            gattServer?.close()
            gattServer = null
            connectedDevices.clear()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }

    @ReactMethod
    fun notifyDevice(address: String, characteristicUuid: String, message: String, promise: Promise) {
        try {
            val device = connectedDevices[address]
            if (device == null) {
                promise.reject("DEVICE_NOT_CONNECTED", "Device $address is not connected")
                return
            }

            val characteristic = facultyToStudentChar
            if (characteristic == null || characteristic.uuid != UUID.fromString(characteristicUuid)) {
                promise.reject("CHAR_NOT_FOUND", "Characteristic not found")
                return
            }

            characteristic.value = message.toByteArray()
            val success = gattServer?.notifyCharacteristicChanged(device, characteristic, false) ?: false
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("NOTIFY_ERROR", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}

