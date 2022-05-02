import {icon, IconLookup, library} from '@fortawesome/fontawesome-svg-core'
import out from '@snickbit/out'
import {default_icon_map} from './utilities/data'
import {IconDefinition, IconName, IconPrefix} from '@fortawesome/fontawesome-common-types'

export type faIconPrefix = IconPrefix | 'fa'

export interface Library {
	definitions?: {
		[key: string]: IconDefinition
	}
}

export type IconSplit = [faIconPrefix, IconName]

export type IconString = `${faIconPrefix}:${IconName}`

export async function useFa(app, icon_aliases): Promise<void> {
	out.verbose('Loading Font Awesome icons...')

	const definitions = (library as unknown as Library)?.definitions || {}

	let iconDefaultPrefixes = {}
	for (let [prefixName, prefixGroup] of Object.entries(definitions)) {
		for (let prefixIconName in prefixGroup) {
			(iconDefaultPrefixes[prefixIconName] = iconDefaultPrefixes[prefixIconName] || []).push(prefixName)
		}
	}

	function parseIcon(iconData) {
		let [width, height, ligatures, , svgPathData] = iconData.icon
		if (ligatures.length < 2 || iconData.prefix !== 'fad') {
			ligatures = [0, 0]
		}
		if (Array.isArray(svgPathData)) {
			for (let svgIndex of svgPathData.keys()) {
				if (!svgPathData[svgIndex].includes('@@fill: var')) {
					if (svgIndex === 0) {
						svgPathData[svgIndex] += '@@fill: var(--fa-secondary-color, currentColor);opacity: 0.4;opacity: var(--fa-secondary-opacity, 0.4);'
					} else if (svgIndex === 1) {
						svgPathData[svgIndex] += '@@fill: var(--fa-primary-color, currentColor);opacity: 1;opacity: var(--fa-primary-opacity, 1);'
					}
				}
			}
			svgPathData = svgPathData.join('&&')
		}
		return svgPathData + '|' + ligatures.join(' ') + ' ' + width + ' ' + height
	}

	function splitIconName(icon_name: string): IconSplit {
		let prefix: faIconPrefix = 'fa'
		if (icon_name.includes(':')) {
			[prefix, icon_name] = icon_name.split(':') as IconSplit
		}

		let prefixed_icon_name = `${prefix}:${icon_name}`
		if (icon_name in icon_aliases) {
			prefixed_icon_name = icon_aliases[icon_name]
		} else if (prefixed_icon_name in icon_aliases) {
			prefixed_icon_name = icon_aliases[prefixed_icon_name]
		}

		let results: IconSplit
		if (prefixed_icon_name.includes(':')) {
			results = prefixed_icon_name.split(':') as IconSplit
		} else {
			results = [prefix, prefixed_icon_name] as IconSplit
		}
		return results
	}

	function parseIconName(raw_icon_name: string): IconLookup {
		let [prefix, iconName] = splitIconName(raw_icon_name)

		if (prefix === 'fa' && iconName in iconDefaultPrefixes && iconDefaultPrefixes[iconName].length === 1) {
			prefix = iconDefaultPrefixes[iconName].slice().pop()
		}

		prefix = prefix as IconPrefix

		return {
			iconName,
			prefix
		}
	}

	app.config.globalProperties.$q.iconSet.set(default_icon_map)

	app.config.globalProperties.$q.iconMapFn = (icon_name) => {
		let parsedIconName = parseIconName(icon_name)
		let foundIcon = icon(parsedIconName)
		if (foundIcon) {
			return {
				cls: 'svg-inline--fa',
				icon: parseIcon(foundIcon)
			}
		}
	}
}
