import {ask, confirm} from '@snickbit/node-utilities'
import {isEmpty, plural} from '@snickbit/utilities'
import {gql} from '@urql/core'
import {$out, client, initConfig, normalizeIconName, saveConfig} from '../utilities/common'
import cli from '@snickbit/node-cli'
import generate from './generate'

export default async argv => cli(argv)
	.args({
		icons: {
			description: 'Icon name',
			type: 'array',
			required: true
		}
	}).run().then(async args => {
		const config = await initConfig()
		let changes = {
			icons: 0,
			aliases: 0
		}

		const queryVersion = config.version === 'svg-fontawesome-v5-pro' ? '5.14.4' : '6.1.1'

		const shouldAddAlias = async alias => !config.aliases[alias] || args.force || await confirm(`Alias {magenta}${alias}{/magenta} already exists for icon {cyan}${config.aliases[alias]}{/cyan}, overwrite?`)

		for (let item of args.icons) {
			let [icon, ...aliases] = item.split(',')

			let iconName = cleanIconName(icon)
			const reg = new RegExp(`^fa[a-z]?:(${iconName})$`)
			if (!config.icons.find(i => reg.test(i))) {
				const iconQuery = gql`
				query ($version: String!, $query: String!) {
					search(version: $version, query: $query, first: 15) {id, styles, label}
				}`

				let results
				try {
					results = await client.query(iconQuery, {
						version: queryVersion,
						query: iconName
					}).toPromise()
				} catch (e) {
					$out.error(`We couldn't find any icons matching {cyan}${iconName}{/cyan}`)
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
							icon_selected = await ask(`Found ${icon_results.length} matches for ${icon}`, {type: 'select', choices: icon_results})
							if (icon_selected === 'None of the above') {
								continue
							}
						}
					}

					iconName = normalizeIconName(icon_selected.replace(/(fa[a-z]?)-/, `$1:`))

					if (!config.icons.includes(iconName)) {
						config.icons.push(iconName)
						$out.v().success(`Added icon {cyan}${iconName}{/cyan}`)
						changes.icons++
					}
				}
			} else {
				$out.warn(`Icon {cyan}${iconName}{/cyan} already exists`)
			}

			if (!isEmpty(aliases)) {
				for (let alias of aliases) {
					if (config.aliases[alias] !== iconName && await shouldAddAlias(alias)) {
						config.aliases[alias] = iconName
						$out.v().success(`Added alias {magenta}${alias}{/magenta}`)
						changes.aliases++
					} else {
						$out.warn(`Alias {magenta}${alias}{/magenta} skipped`)
					}
				}
			}
		}

		if (changes.icons || changes.aliases) {
			saveConfig(config)
			changes.icons && $out.success(`Added {cyan}${changes.icons} ${plural('icon', changes.icons)}{/cyan}`)
			changes.aliases && $out.success(`Added {magenta}${changes.aliases} ${plural('alias', changes.aliases)}{/magenta}`)
			return generate()
		}
		$out.done('Nothing to update')
	})
