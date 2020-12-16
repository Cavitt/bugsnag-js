import prompts from 'prompts'
import logger from '../Logger'
import { updateXcodeProject } from '../lib/Xcode'
import { install, detectInstalled, guessPackageManager } from '../lib/Npm'
import onCancel from '../lib/OnCancel'
import { enableReactNativeMappings } from '../lib/Gradle'

const DEFAULT_UPLOAD_ENDPOINT = 'https://upload.bugsnag.com'

const DSYM_INSTRUCTIONS = `To configure your project to upload dSYMs, follow the iOS symbolication guide:

    https://docs.bugsnag.com/platforms/ios/symbolication-guide/

  This will enable you to see full native stacktraces. It can't be done automatically.

`

export default async function run (argv: string[], projectRoot: string, opts: Record<string, unknown>): Promise<void> {
  try {
    let uploadEndpoint: string|null = null

    const { iosIntegration } = await prompts({
      type: 'confirm',
      name: 'iosIntegration',
      message: 'Do you want to automatically upload source maps as part of the Xcode build?',
      initial: true
    }, { onCancel })

    if (iosIntegration) {
      uploadEndpoint = await getUploadEndpoint(uploadEndpoint)

      logger.info('Modifying the Xcode project')
      await updateXcodeProject(projectRoot, nullIfDefault(uploadEndpoint), logger)
    }

    await prompts({
      type: 'text',
      name: 'dsymUploadInstructions',
      message: DSYM_INSTRUCTIONS,
      initial: 'Hit enter to continue …'
    }, { onCancel })

    const { androidIntegration } = await prompts({
      type: 'confirm',
      name: 'androidIntegration',
      message: 'Do you want to automatically upload source maps as part of the Gradle build?',
      initial: true
    }, { onCancel })

    if (androidIntegration) {
      uploadEndpoint = await getUploadEndpoint(uploadEndpoint)

      await enableReactNativeMappings(projectRoot, nullIfDefault(uploadEndpoint), logger)
    }

    if (androidIntegration || iosIntegration) {
      await installJavaScriptPackage(projectRoot)
    }
  } catch (e) {
    logger.error(e)
  }
}

async function installJavaScriptPackage (projectRoot: string): Promise<void> {
  const alreadyInstalled = await detectInstalled('@bugsnag/source-maps', projectRoot)

  if (alreadyInstalled) {
    logger.warn('@bugsnag/source-maps is already installed, skipping')
    return
  }

  logger.info('Adding @bugsnag/source-maps dependency')

  const packageManager = await guessPackageManager(projectRoot)

  const { version } = await prompts({
    type: 'text',
    name: 'version',
    message: 'If you want the latest version of @bugsnag/source-maps hit enter, otherwise type the version you want',
    initial: 'latest'
  }, { onCancel })

  await install(packageManager, '@bugsnag/source-maps', version, true, projectRoot)

  logger.success('@bugsnag/source-maps dependency is installed')
}

async function getUploadEndpoint (maybeEndpoint: string|null): Promise<string> {
  if (maybeEndpoint) {
    return maybeEndpoint
  }

  const { endpoint } = await prompts({
    type: 'text',
    name: 'endpoint',
    message: 'What is your Bugsnag upload endpoint?',
    initial: DEFAULT_UPLOAD_ENDPOINT
  }, { onCancel })

  return endpoint
}

function nullIfDefault (maybeEndpoint: string|null): string|null {
  if (maybeEndpoint === DEFAULT_UPLOAD_ENDPOINT) {
    return null
  }

  return maybeEndpoint
}
