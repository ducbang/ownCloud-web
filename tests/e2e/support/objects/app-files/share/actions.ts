import { Page } from 'playwright'
import { Group, User } from '../../../types'
import { sidebar } from '../utils'
import { clickResource } from '../resource/actions'
import util from 'util'

const invitationInput = '#files-share-invite-input'
const filesCollaboratorRolesSelector = '//*[@id="files-collaborators-role-button-new"]'
const collaboratorRoleItemSelector = `//*[@id="files-role-%s"]`
const shareInvitationButton = '#new-collaborators-form-create-button'
const filesSharedWithMeAccepted = `#files-shared-with-me-accepted-section [data-test-resource-name="%s"]`
const collaboratorUserItem = `//*[@data-testid="collaborator-user-item-%s"]`
const shareAcceptDeclineButton = `//*[@data-test-resource-name="%s"]/ancestor::tr//button[contains(@class, "file-row-share-%s")]`
const quickShareButton = `//*[@data-test-resource-name="%s"]/ancestor::tr//button[contains(@class, "files-quick-action-collaborators")]`
const recipientRoleDropdownButton = `%s//button[contains(@class,"files-recipient-role-select-btn")]`
const recipientRoleItemSelector = `%s//ul[contains(@class,"files-recipient-role-drop-list")]//button[@id="files-recipient-role-drop-btn-%s"]`
const collaboratorEditDropdownButton = `%s//button[contains(@class,"collaborator-edit-dropdown-options-btn")]`
const collaboratorUserSelector = `//*[@data-testid="collaborator-user-item-%s"]`
const removeShareButton = `%s//ul[contains(@class,"collaborator-edit-dropdown-options-list")]//button[contains(@class,"remove-share")]`
const removeShareConfirmationButton = '.oc-modal-body-actions-confirm'
export interface createShareArgs {
  page: Page
  folder: string
  recipients: User[] | Group[]
  role: string
  via: 'SIDEBAR_PANEL' | 'QUICK_ACTION'
}

export const createShare = async (args: createShareArgs): Promise<void> => {
  const { page, folder, recipients, role, via } = args
  const folderPaths = folder.split('/')
  const folderName = folderPaths.pop()

  if (folderPaths.length) {
    await clickResource({ page: page, path: folderPaths.join('/') })
  }

  switch (via) {
    case 'QUICK_ACTION':
      await page.locator(util.format(quickShareButton, folderName)).click()
      break

    case 'SIDEBAR_PANEL':
      await sidebar.open({ page: page, resource: folderName })
      await sidebar.openPanel({ page: page, name: 'sharing' })
      break
  }

  await inviteMembers({ page, recipients, role })
  await sidebar.close({ page: page })
}

export interface createReshareArgs {
  page: Page
  folder: string
  recipients: User[] | Group[]
  role: string
}

export const createReshare = async (args: createReshareArgs): Promise<void> => {
  const { page, folder, recipients, role } = args
  const folderPaths = folder.split('/')
  const folderName = folderPaths.pop()

  if (folderPaths.length) {
    await clickResource({ page: page, path: folderPaths.join('/') })
  }
  await sidebar.openPanelForResource({ page: page, resource: folderName, panel: 'shares' })

  await inviteMembers({ page, recipients, role })
  await sidebar.close({ page: page })
}

export interface inviteMembersArgs {
  page: Page
  recipients: User[] | Group[]
  role: string
}

export const inviteMembers = async (args: inviteMembersArgs): Promise<void> => {
  const { page, role, recipients } = args
  for (const recipient of recipients) {
    const shareInputLocator = page.locator(invitationInput)
    await shareInputLocator.click()
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('sharees') && resp.status() === 200),
      shareInputLocator.fill(recipient.id)
    ])
    await shareInputLocator.focus()
    await page.waitForSelector('.vs--open')
    await page.locator('.vs__dropdown-option').click()

    await page.locator(filesCollaboratorRolesSelector).click()
    await page.locator(util.format(collaboratorRoleItemSelector, role)).click()
  }

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith('shares') && resp.status() === 200 && resp.request().method() === 'POST'
    ),
    page.locator(shareInvitationButton).click()
  ])
}

/**/

export interface acceptShareArgs {
  name: string
  page: Page
}

export const acceptShare = async (args: acceptShareArgs): Promise<void> => {
  const { name, page } = args
  await Promise.all([
    page.locator(util.format(shareAcceptDeclineButton, name, 'status-accept')).click(),
    page.waitForResponse((resp) => resp.url().includes('shares') && resp.status() === 200),
    page.locator(util.format(filesSharedWithMeAccepted, args.name)).waitFor()
  ])
}

/**/

export interface declineShareArgs {
  page: Page
  name: string
}

export const declineShare = async (args: declineShareArgs): Promise<void> => {
  const { page, name } = args
  await page.locator(util.format(shareAcceptDeclineButton, name, 'decline')).click()
  await page.waitForResponse((resp) => resp.url().includes('shares') && resp.status() === 200)
}

/**/

export interface changeShareeRoleArgs {
  page: Page
  folder?: string
  users: User[]
  role: string
}

export const changeShareeRole = async (args: changeShareeRoleArgs): Promise<void> => {
  const { page, folder, users, role } = args
  if (folder) {
    const folderPaths = folder.split('/')
    const folderName = folderPaths.pop()

    if (folderPaths.length) {
      await clickResource({ page, path: folderPaths.join('/') })
    }

    await sidebar.open({ page, resource: folderName })
    await sidebar.openPanel({ page, name: 'sharing' })
  }

  for (const user of users) {
    const userColumn = util.format(collaboratorUserItem, user.id)
    await Promise.all([
      page.click(util.format(recipientRoleDropdownButton, userColumn)),
      page.click(util.format(recipientRoleItemSelector, userColumn, role)),
      page.waitForResponse((resp) =>
        folder
          ? resp.url().includes('shares') &&
            resp.status() === 200 &&
            resp.request().method() === 'PUT'
          : resp.url().includes('shares') &&
            resp.status() === 200 &&
            resp.request().method() === 'POST'
      )
    ])
  }
}

/**/

export interface removeShareeArgs {
  page: Page
  folder?: string
  users: User[]
  removeOwnSpaceAccess?: boolean
}

export const removeSharee = async (args: removeShareeArgs): Promise<void> => {
  const { page, folder, users, removeOwnSpaceAccess } = args
  if (folder) {
    const folderPaths = folder.split('/')
    const folderName = folderPaths.pop()

    if (folderPaths.length) {
      await clickResource({ page, path: folderPaths.join('/') })
    }

    await sidebar.open({ page: page, resource: folderName })
    await sidebar.openPanel({ page: page, name: 'sharing' })
  }

  for (const user of users) {
    const userColumn = util.format(collaboratorUserSelector, user.id)

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('shares') &&
          resp.status() === 200 &&
          resp.request().method() === 'DELETE'
      ),
      page.locator(util.format(collaboratorEditDropdownButton, userColumn)).first().click(),
      page.locator(util.format(removeShareButton, userColumn)).click(),
      page.locator(removeShareConfirmationButton).click()
    ])
    if (removeOwnSpaceAccess) {
      await page.waitForNavigation()
    }
  }
}
