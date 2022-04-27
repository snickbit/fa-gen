import cli from '@snickbit/node-cli'
import {ask, confirm} from '@snickbit/node-utilities'
import {isEmpty, plural} from '@snickbit/utilities'
import {gql} from '@urql/core'
import {_out, client, normalizeIconName, saveConfig, useConfig} from '../utilities/common'
import generate from './generate'

export default async function (argv) {
	return cli(argv)
	.args({
		icons: {
			description: 'Icon name',
			type: 'array',
			required: true
		}
	}).run().then(async args => {
		const config = await useConfig()
		let changes = {
			icons: 0,
			aliases: 0
		}

		const shouldAddAlias = async alias => {
			return !config.aliases[alias] || args.force || await confirm(`Alias {magenta}${alias}{/magenta} already exists for icon {cyan}${config.aliases[alias]}{/cyan}, overwrite?`)
		}

		for (let item of args.icons) {
			let [icon, ...aliases] = item.split(',')

			let iconName = normalizeIconName(icon.replace(/(fa[a-z]?)-/, `$1:`))
			if (!config.icons.includes(iconName)) {
				const iconQuery = gql`
					query ($query: String) {
						search(version: "6.1.1", query: $query, first: 15) {
							id
						}
					}
				`

				let results
				try {
					results = await client
						.query(iconQuery, {query: iconName.replace(/fa:/, '')})
						.toPromise()
				} catch (e) {
					_out.error(`We couldn't find any icons matching {cyan}${iconName}{/cyan}`)
					continue
				}

				const icon_results = results?.data?.search?.map(r => r.id) || []

				if (icon_results.length) {
					let icon_selected = icon_results.find(r => r === icon)

					if (!icon_selected) {
						if (icon_results.length === 1) {
							icon_selected = icon_results[0]
						} else {
							icon_results.push('None of the above')
							icon_selected = await ask(`Found ${icon_results.length} matches for ${icon}`, {type: 'list', choices: icon_results})
							if (icon_selected === 'None of the above') {
								continue
							}
						}
					}

					iconName = normalizeIconName(icon_selected.replace(/(fa[a-z]?)-/, `$1:`))

					if (!config.icons.includes(iconName)) {
						config.icons.push(iconName)
						_out.v().success(`Added icon {cyan}${iconName}{/cyan}`)
						changes.icons++
					}
				}
			} else {
				_out.warn(`Icon {cyan}${iconName}{/cyan} already exists`)
			}

			if (!isEmpty(aliases)) {
				for (let alias of aliases) {
					if (config.aliases[alias] !== iconName && await shouldAddAlias(alias)) {
						config.aliases[alias] = iconName
						_out.v().success(`Added alias {magenta}${alias}{/magenta}`)
						changes.aliases++
					} else {
						_out.warn(`Alias {magenta}${alias}{/magenta} skipped`)
					}
				}
			}
		}

		if (changes.icons || changes.aliases) {
			saveConfig(config)
			changes.icons && _out.success(`Added {cyan}${changes.icons} ${plural('icon', changes.icons)}{/cyan}`)
			changes.aliases && _out.success(`Added {magenta}${changes.aliases} ${plural('alias', changes.aliases)}{/magenta}`)
			return generate()
		} else {
			_out.done('Nothing to update')
		}
	})
}
