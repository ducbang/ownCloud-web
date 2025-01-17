import { shallowMount, createLocalVue } from '@vue/test-utils'
import VueCompositionAPI from '@vue/composition-api'
import Vuex from 'vuex'
import GetTextPlugin from 'vue-gettext'
import fileSideBars from 'web-app-files/src/fileSideBars'
import stubs from '@/tests/unit/stubs'
import merge from 'lodash-es/merge'
import { buildResource } from 'web-app-files/src/helpers/resources'
import { clientService } from 'web-pkg/src/services'
import { createLocationPublic, createLocationSpaces } from '../../../../src/router'

import InnerSideBar from 'web-pkg/src/components/sideBar/SideBar.vue'
import SideBar from 'web-app-files/src/components/SideBar/SideBar.vue'

jest.mock('web-pkg/src/observer')
jest.mock('web-app-files/src/helpers/resources', () => {
  const original = jest.requireActual('web-app-files/src/helpers/resources')
  return {
    ...original,
    buildResource: jest.fn()
  }
})

const selectors = {
  noSelectionInfoPanel: 'noselection-stub'
}

describe('SideBar', () => {
  describe('no selection info panel', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })
    describe('for public links', () => {
      it.each([
        [
          'shows in root node',
          {
            path: '',
            noSelectionExpected: true
          }
        ],
        [
          'does not show in non-root node',
          {
            path: '/publicLinkToken/some-folder',
            noSelectionExpected: false
          }
        ]
      ])('%s', async (name, { path, noSelectionExpected }) => {
        const item = { path }
        const mockFileInfo = jest.fn()
        mockFileInfo.mockReturnValue(item)
        buildResource.mockReturnValue(item)
        const wrapper = createWrapper({
          item,
          selectedItems: [],
          mocks: {
            $client: { publicFiles: { getFileInfo: mockFileInfo } }
          },
          currentRoute: createLocationPublic('files-public-link')
        })
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(wrapper.find(selectors.noSelectionInfoPanel).exists()).toBe(noSelectionExpected)
      })
    })
    describe('for all files', () => {
      it.each([
        [
          'shows in root node',
          {
            path: '/',
            noSelectionExpected: true
          }
        ],
        [
          'does not show in non-root node',
          {
            path: '/some-folder',
            noSelectionExpected: false
          }
        ]
      ])('%s', async (name, { path, noSelectionExpected }) => {
        const item = { path }
        const mockFileInfo = jest.fn()
        mockFileInfo.mockReturnValue(item)
        buildResource.mockReturnValue(item)
        const wrapper = createWrapper({
          item,
          selectedItems: [],
          mocks: {
            $client: { files: { fileInfo: mockFileInfo } }
          }
        })
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(wrapper.find(selectors.noSelectionInfoPanel).exists()).toBe(noSelectionExpected)
      })
    })
  })
})

function createWrapper({
  item,
  selectedItems,
  mocks,
  fileFetchMethod = () => ({}),
  currentRoute = createLocationSpaces('files-spaces-generic')
}) {
  const localVue = createLocalVue()
  localVue.prototype.$clientService = clientService
  localVue.use(Vuex)
  localVue.use(VueCompositionAPI)
  localVue.use(GetTextPlugin, {
    translations: 'does-not-matter.json',
    silent: true
  })
  return shallowMount(SideBar, {
    propsData: {
      open: true
    },
    store: new Vuex.Store({
      getters: {
        user: function () {
          return { id: 'marie' }
        },
        capabilities: () => ({
          files_sharing: {
            api_enabled: true,
            public: { enabled: true }
          }
        }),
        configuration: () => ({
          server: 'https://example.com'
        })
      },
      modules: {
        apps: {
          getters: {
            fileSideBars: () => fileSideBars
          }
        },
        Files: {
          namespaced: true,
          state: {
            highlightedFile: item
          },
          getters: {
            highlightedFile: (state) => state.highlightedFile,
            selectedFiles: () => selectedItems
          },
          mutations: {
            SET_HIGHLIGHTED_FILE(state, file) {
              state.highlightedFile = file
            }
          },
          actions: {
            loadCurrentFileOutgoingShares: jest.fn(),
            loadIncomingShares: jest.fn(),
            loadSharesTree: jest.fn(),
            deleteShare: jest.fn()
          }
        },
        runtime: {
          modules: {
            auth: {
              getters: {
                publicLinkPassword: () => ''
              }
            }
          }
        }
      }
    }),
    localVue,
    stubs: {
      ...stubs,
      SideBar: InnerSideBar
    },
    directives: {
      'click-outside': jest.fn()
    },
    setup: () => {
      return {
        webdav: { getFileInfo: fileFetchMethod }
      }
    },
    mocks: merge(
      {
        $router: {
          currentRoute,
          resolve: (r) => {
            return { href: r.name }
          },
          afterEach: jest.fn()
        }
      },
      mocks
    )
  })
}
