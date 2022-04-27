import {icon, library} from '@fortawesome/fontawesome-svg-core'
import out from '@snickbit/out'
import {default_icon_map} from './utilities/data'

/**
 * @typedef {import('@fortawesome/fontawesome-common-types').IconName} IconName
 * @typedef {import('@fortawesome/fontawesome-common-types').IconPrefix} IconPrefix
 * @typedef {import('@fortawesome/fontawesome-common-types').IconLookup} IconLookup
 * @typedef {import('@fortawesome/fontawesome-common-types').IconDefinition} IconDefinition
 * @typedef {import('@fortawesome/fontawesome-common-types').IconPack} IconPack
 */

/**
 * @param app
 * @param icon_aliases
 * @return {Promise<void>}
 */
export async function useFa(app, icon_aliases) {
	out.verbose('Loading Font Awesome icons...')

	// noinspection JSUnresolvedVariable
	const definitions = library?.definitions || {}

	let iconDefaultPrefixes = {}
	for (let [prefixName, prefixGroup] of Object.entries(definitions)) {
		for (let prefixIconName in prefixGroup) {
			(iconDefaultPrefixes[prefixIconName] = iconDefaultPrefixes[prefixIconName] || []).push(prefixName)
		}
	}

	function parseIcon(iconData) {
		// noinspection JSUnusedLocalSymbols
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

	/**
	 * @param {string} icon_name
	 * @return {[IconPrefix, IconName]}
	 */
	function splitIconName(icon_name) {
		let prefix = 'fa'
		if (icon_name.includes(':')) {
			[prefix, icon_name] = icon_name.split(':')
		}

		/**
		 * @type {`${IconPrefix}:${IconName}`}
		 */
		let prefixed_icon_name = `${prefix}:${icon_name}`

		if (icon_name in icon_aliases) {
			prefixed_icon_name = icon_aliases[icon_name]
		} else if (prefixed_icon_name in icon_aliases) {
			prefixed_icon_name = icon_aliases[prefixed_icon_name]
		}

		return prefixed_icon_name.includes(':') ? prefixed_icon_name.split(':') : [
			prefix,
			prefixed_icon_name
		]
	}

	/**
	 * @param {string} raw_icon_name
	 * @return {IconLookup}
	 */
	function parseIconName(raw_icon_name) {
		let [prefix, iconName] = splitIconName(raw_icon_name)

		if (prefix === 'fa' && iconName in iconDefaultPrefixes && iconDefaultPrefixes[iconName].length === 1) {
			prefix = iconDefaultPrefixes[iconName].slice().pop()
		}

		return {
			/** @type {IconName} */ iconName,
			/** @type {import('@fortawesome/fontawesome-common-types').IconPrefix} */ prefix
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
