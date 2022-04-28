#!/usr/bin/env node

import cli from '@snickbit/node-cli'
import {out} from '@snickbit/out'
import packageJson from '../package.json'
import * as actions from './actions'

cli()
	.name(packageJson.name)
	.version(packageJson.version)
	.actions(actions)
	.defaultAction('generate')
	.run()
	.then(() => out.done('Done!'))
	.catch(err => out.fatal(err))
