import {ask, confirm, fileExists, getFileJson, saveFileJson} from '@snickbit/node-utilities'
import out, {Out} from '@snickbit/out'
import {createClient} from '@urql/core'
import 'isomorphic-unfetch'
import camelCase from 'lodash/camelCase'
import path from 'path'
import {default_icon_aliases, default_icons, icon_prefix_types} from './data'

let config

export const _out = new Out('fa-cli')

export const client = createClient({
	url: 'https://api.fontawesome.com'
})

export function getNodeModulesPath() {
	return path.join(process.cwd(), 'node_modules')
}

export const config_path = path.join(process.cwd(), 'fa.config.json')

export async function initConfig() {
	if (!config) {
		if (!fileExists(config_path)) {
			// create with inquirer
			_out.block.info('fa-cli config')

			config.version = await ask('Which FontAwesome version?', {
				type: 'select',
				choices: [
					{
						title: 'FontAwesome Pro 5',
						value: 'svg-fontawesome-v5-pro'
					},
					{
						title: 'FontAwesome Pro 6',
						value: 'svg-fontawesome-v6-pro'
					}
				]
			})

			if (!config.version) {
				out.fatal('No FontAwesome version selected')
			}

			config.default = await ask('Default Style?', {
				type: 'select',
				choices: [
					{
						title: 'Regular',
						value: 'far'
					},
					{
						title: 'Solid',
						value: 'fas'
					},
					{
						title: 'Light',
						value: 'fal'
					},
					{
						title: 'Duotone',
						value: 'fad'
					}
				]
			})

			if (!config.default) {
				out.fatal('No default style selected')
			}

			if (fileExists('tsconfig.json') && await confirm('Use TypeScript?')) {
				config.typescript = true
			}

			config.icons = default_icons.slice()
			config.aliases = {...default_icon_aliases}
			if (fileExists('quasar.conf.js') || fileExists('quasar.config.js')) {
				_out.info('Quasar Framework detected!')
				config.isQuasar = true
			}

			saveConfig(config)
		} else {
			try {
				config = getFileJson(config_path)
			} catch (e) {
				_out.error('Error parsing config file: ' + e.message)
				process.exit(1)
			}
		}
	}

	icon_prefix_types.fa = icon_prefix_types[config.default]

	return config
}

export function useConfig() {
	if (!config) {
		out.throw('No config found!')
	}

	icon_prefix_types.fa = icon_prefix_types[config.default]

	return config
}

export function saveConfig(conf) {
	config = conf
	return saveFileJson(config_path, config)
}

export function normalizeIconName(icon_name: string): string {
	icon_name = icon_name.replace(/(fa[a-z]?)[-:]/, `$1:`)
	if (!icon_name.includes(':')) {
		icon_name = 'fa:' + icon_name
	}
	return icon_name
}

export function parseIcon(raw_icon_name) {
	let config = useConfig()

	let normalizedIconName = normalizeIconName(raw_icon_name)
	let [prefix, name] = normalizedIconName.split(':')

	if (prefix === 'fa' && config.default) {
		prefix = config.default
	}

	let import_name = camelCase('fa-' + name)
	let prefixed_name = camelCase(prefix + '-' + name)
	let import_path = '@fortawesome/' + (icon_prefix_types[prefix] || icon_prefix_types['fa'])

	return {
		id: normalizedIconName,
		prefix,
		name,
		import_name,
		prefixed_name,
		import_path
	}
}

export function getImportString(icon) {
	if (typeof icon === 'string') {
		icon = parseIcon(icon)
	}

	const import_name = icon.import_name === icon.prefixed_name ? icon.import_name : `${icon.import_name} as ${icon.prefixed_name}`
	return `import {${import_name}} from "${icon.import_path}/${icon.import_name}"`
}

export function getStringContent(content, config) {
	let contentString

	let iconAliases = {...default_icon_aliases, ...config.aliases}
	const aliases_string = 'const icon_aliases = ' + JSON.stringify(iconAliases, null, 2)

	if (config.isQuasar) {
		contentString = `
// required
import {boot} from 'quasar/wrappers'
import {useFa} from '@snickbit/fa-gen'
import {library} from "@fortawesome/fontawesome-svg-core"

${content.join('\n')}
${aliases_string}

/**
 * @param {Object} BootFileParams
 */
export default boot(async ({app}) => {
	await useFa(app, icon_aliases)
})
`
	} else {
		contentString = `
import {library} from "@fortawesome/fontawesome-svg-core"

${content.join('\n')}
${aliases_string}
`
	}
	return contentString
}
