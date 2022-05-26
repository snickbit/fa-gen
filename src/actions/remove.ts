import {isEmpty, objectFilter, plural} from '@snickbit/utilities'
import {_out, initConfig, parseIcon, saveConfig} from '../utilities/common'
import cli from '@snickbit/node-cli'
import generate from './generate'

export default async argv => cli(argv)
	.args({
		subjects: {
			description: 'Icon or alias to remove (aliases must be combined with the --alias flag)',
			type: 'array'
		}
	})
	.options({
		alias: {
			alias: 'a',
			description: 'Remove an alias instead of an icon'
		}
	})
	.run()
	.then(async args => {
		const config = await initConfig()
		let changes = {
			icons: 0,
			aliases: 0
		}

		for (let subject of args.subjects) {
			const icon = parseIcon(subject)
			const iconPredicate = i => i === icon.id || i === icon.name || i === `fa:${icon.name}`
			if (!args.alias) {
				const icons = config.icons.filter(iconPredicate)
				if (!isEmpty(icons)) {
					config.icons = config.icons.filter(i => !icons.includes(i))
					_out.v().success(`Removed ${plural('icon', icons.length)} {cyan}${icons.join(', ')}{/cyan}`)
					changes.icons += icons.length
				} else {
					_out.warn(`Icon {cyan}${icon.id}{/cyan} has not been added`)
				}

				const aliases = Object.keys(objectFilter(config.aliases, iconPredicate))
				if (!isEmpty(aliases)) {
					config.aliases = objectFilter(config.aliases, (i, a) => !aliases.includes(a))
					_out.v().success(`Removed ${plural('alias', icons.length)}{magenta} ${aliases.join(', ')}{/magenta} from icon {cyan}${icon.id}{/cyan}`)
					changes.aliases += aliases.length
				} else {
					_out.warn(`There are no aliases for icon {cyan}${icon.id}{/cyan}`)
				}
			} else if (config.aliases[subject]) {
				const iconName = config.aliases[subject]
				delete config.aliases[subject]
				_out.v().success(`Removed alias {magenta}${subject}{/magenta} from icon {cyan}${iconName}{/cyan}`)
				changes.aliases++
			} else {
				_out.warn(`Alias {cyan}${subject}{/cyan} has not been added.`)
			}
		}

		if (changes.icons || changes.aliases) {
			saveConfig(config)
			changes.icons && _out.success(`Removed {cyan}${changes.icons} ${plural('icon', changes.icons)}{/cyan}`)
			changes.aliases && _out.success(`Removed {magenta}${changes.aliases} ${plural('alias', changes.aliases)}{/magenta}`)
			return generate()
		}
		_out.done('Nothing to update')
	})
