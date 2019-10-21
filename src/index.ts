import { exec } from 'child_process'
import * as _ from 'lodash'
import * as os from 'os'

const wmic = require('wmic')

interface NetworkEverywhere {
	getActiveInterface(): Promise<{ ip: string, mac: string }>

	getIpAddress(): Promise<string>

	getAllMacAddresses(): Promise<string[]>
}

enum OSType {
	Windows = 'Windows',
	Other = 'Other',
}

const MAC_REGEX = /(?:[a-z0-9]{2}[:\-]){5}[a-z0-9]{2}/ig
const MAC_ZERO_REGEX = /(?:[0]{2}[:\-]){5}[0]{2}/

function execAsync(command: string, options = {
	log: false,
	cwd: process.cwd(),
}): Promise<{ stdout: string, stderr: string }> {
	return new Promise((resolve, reject) => {
		exec(command, { ...options }, (err, stdout, stderr) => {
			if (err) {
				reject(err)
				return
			}
			resolve({ stdout, stderr })
		})
	})
}

class NetworkEverywhereImpl implements NetworkEverywhere {
	private readonly osType: OSType
	private readonly command: string

	constructor() {
		this.osType = process.platform.indexOf('win') === 0 ? OSType.Windows : OSType.Other
		this.command = this.osType === OSType.Windows ? '%SystemRoot%/System32/getmac.exe' : '/sbin/ifconfig -a || /sbin/ip link'
	}

	async getActiveInterface(): Promise<{ ip: string, mac: string }> {
		const activeIface = await this.getActiveInterfaceName()
		const networkInterfaces = os.networkInterfaces()
		if (networkInterfaces[activeIface]) {
			const iface = networkInterfaces[activeIface].find(iface => iface.family === 'IPv4')
			if (iface) {
				return { ip: iface.address, mac: iface.mac }
			}
		}
		throw new Error('No suitable active interface found')
	}

	async getIpAddress(): Promise<string> {
		const { ip } = await this.getActiveInterface()
		if (ip) {
			return ip
		}
		const candidate = _.flatMap(_.values(os.networkInterfaces())).find((iface) => iface.family === 'IPv4' && !iface.internal)
		if (candidate && candidate.address) {
			return candidate.address
		}
		throw new Error('No suitable ip address found')
	}

	async getAllMacAddresses(): Promise<string[]> {
		const { stdout } = await execAsync(this.command)
		return NetworkEverywhereImpl.pullMac(stdout)
	}

	private async getActiveInterfaceName(): Promise<string> {

		if (this.osType === OSType.Windows) {
			return new Promise((resolve, reject) => {
				wmic.get_value('nic', 'NetConnectionID', 'NetConnectionStatus = 2', (err: any, value: string) => {
					if (err) {
						reject(err)
					}
					resolve(value)
				})
			})
		} else {
			const cmd = `netstat -rn | grep UG | awk '{print $NF}'`

			const { stderr, stdout } = await execAsync(cmd)
			if (stderr) {
				throw new Error('Fail to retrieve active interface')
			}
			const raw = stdout.toString().trim().split('\n')
			if (raw.length === 0 || raw === ['']) {
				throw new Error('No active network interface found.')
			}
			return raw[0]
		}
	}

	private static pullMac(data: string, iface?: string): string[] {
		const toExtract = iface ? NetworkEverywhereImpl.filterByInterface(iface, data) : data
		const result = []
		let match = MAC_REGEX.exec(toExtract)
		while (match) {
			const macAddress = match[0]
			if (!MAC_ZERO_REGEX.test(macAddress)) {
				result.push(macAddress)
			}
			match = MAC_REGEX.exec(toExtract)
		}
		return _.uniq(result)
	}

	private static filterByInterface(iface: string, str: string): string {
		const ifaceRegex = new RegExp(`${ iface }[:\\s]`)
		const lines = str.split(/\r?\n/g)
		let result = ''
		let padding = null
		for (let line in lines) {
			if (result.length === 0 && ifaceRegex.test(line)) {
				result += line
			} else if (padding === null) {
				const match = /^(\s+)/.exec(line)
				result += `\n${ line }`
				padding = new RegExp(`^${ match && match[1] }`)
			} else if (padding.exec(line)) {
				result += `\n${ line }`
			}
		}
		return result
	}

}

export const networkEverywhere = new NetworkEverywhereImpl()
