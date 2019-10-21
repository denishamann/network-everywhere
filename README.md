# network-everywhere

## Goal

`os.networkInterfaces()` only return interfaces that have been assigned a network address. This package has been made to ensure that we always retrieve a mac address (even if we are offline or the wire is unplugged).
## Usage
```javascript
const { networkEverywhere } =  require('network-everywhere')
try {
	const  activeInterface  =  await  networkEverywhere.getActiveInterface()
	const  ipAddress  =  await  networkEverywhere.getIpAddress()
	const  allMacAddresses  =  await  networkEverywhere.getAllMacAddresses()
	console.log('activeInterface:', activeInterface)
	// activeInterface: Object {ip: "192.168.63.101", mac: "8c:85:90:54:19:f3"}
	console.log('ipAddress:', ipAddress)
	// ipAddress: 192.168.63.101
	console.log('allMacAddresses:', allMacAddresses)
	// allMacAddresses:Array(8) ["8c:85:90:54:19:f3", "0e:85:90:54:19:f3", "6e:b4:f4:a6:4e:1f", "82:d4:66:81:2c:00", "82:d4:66:81:2c:01", "82:d4:66:81:2c:05", "82:d4:66:81:2c:04", "ac:de:48:00:11:22"]
} catch(e) {
	console.error(e)
}
```
