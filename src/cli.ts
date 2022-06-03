#!/usr/bin/env node

import {cli} from '@snickbit/node-cli'
import {out} from '@snickbit/out'
import * as actions from './actions'
import packageJson from '../package.json'

cli()
	.name(packageJson.name)
	.version(packageJson.version)
	.actions(actions)
	.run()
	.then(() => out.done('Done!'))
	.catch(err => out.fatal(err))
