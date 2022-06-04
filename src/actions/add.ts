import {ask, ChoiceOption, confirm} from '@snickbit/node-utilities'
import {isEmpty, plural} from '@snickbit/utilities'
import {gql} from '@urql/core'
import {$out, cleanIconName, client, iconExists, initConfig, normalizeIconName, saveConfig} from '../utilities/common'
import cli from '@snickbit/node-cli'
import generate from './generate'

interface IconResult {
	id: string
	label: string
	styles: string[]
}

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
			if (!iconExists(iconName)) {
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

				const icon_results: IconResult[] = results?.data?.search || []

				if (icon_results.length) {
					let icon_selected: IconResult | 'None of the above' = icon_results.find(r => r.id === icon)

					if (!icon_selected) {
						if (icon_results.length === 1) {
							icon_selected = icon_results[0]
						} else {
							const choices: ChoiceOption[] = icon_results.map(r => ({
								title: `${r.label}\t(${r.styles.join(', ')})`,
								value: r.id
							}))
							choices.push('None of the above')
							icon_selected = await ask(`Found ${icon_results.length} matches for ${icon}`, {
								type: 'select',
								choices
							})
							if (icon_selected === 'None of the above') {
								continue
							}
						}
					}

					if (icon_selected) {
						iconName = normalizeIconName(icon_selected.id)
						if (icon_selected.styles.includes('brands')) {
							iconName = iconName.replace(/fa:/, 'fab:')
						}

						if (!iconExists(iconName)) {
							config.icons.push(iconName)
							$out.v().success(`Added icon {cyan}${iconName}{/cyan}`)
							changes.icons++
						}
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
