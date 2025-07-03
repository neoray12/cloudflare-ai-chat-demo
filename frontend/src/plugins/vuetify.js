import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Cloudflare 品牌配色主題
const customTheme = {
  defaultTheme: 'light',
  themes: {
    light: {
      dark: false,
      colors: {
        primary: '#F38020',        // Cloudflare 橙色
        secondary: '#003682',      // Cloudflare 深藍色
        accent: '#F38020',
        error: '#E53E3E',
        info: '#003682',
        success: '#38A169',
        warning: '#F38020',
        background: '#FAFAFA',
        surface: '#FFFFFF',
        'on-primary': '#FFFFFF',
        'on-secondary': '#FFFFFF',
        'on-surface': '#4F4F4F',
        'on-background': '#4F4F4F',
        'chat-bg': '#F7FAFC',
        'user-message': '#FFF5F0',
        'ai-message': '#F7FAFC',
        'user-bubble': '#F38020',
        'ai-bubble': '#003682',
        'code-bg': '#F7FAFC',
        'code-border': '#E2E8F0'
      }
    },
    dark: {
      dark: true,
      colors: {
        primary: '#F38020',        // Cloudflare 橙色
        secondary: '#0066CC',      // 較亮的藍色用於深色模式
        accent: '#F38020',
        error: '#FC8181',
        info: '#0066CC',
        success: '#68D391',
        warning: '#F38020',
        background: '#1A202C',
        surface: '#2D3748',
        'on-primary': '#FFFFFF',
        'on-secondary': '#FFFFFF',
        'on-surface': '#F7FAFC',
        'on-background': '#F7FAFC',
        'chat-bg': '#1A202C',
        'user-message': '#2D3748',
        'ai-message': '#4A5568',
        'user-bubble': '#F38020',
        'ai-bubble': '#0066CC',
        'code-bg': '#2D3748',
        'code-border': '#4A5568'
      }
    }
  }
}

// 創建 Vuetify 實例
export default createVuetify({
  components,
  directives,
  theme: customTheme,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  defaults: {
    // 全局元件預設值
    VBtn: {
      variant: 'flat',
      density: 'default'
    },
    VCard: {
      elevation: 2
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable'
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable'
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable'
    },
    VChip: {
      variant: 'flat'
    }
  },
  display: {
    mobileBreakpoint: 'sm',
    thresholds: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920
    }
  }
}) 