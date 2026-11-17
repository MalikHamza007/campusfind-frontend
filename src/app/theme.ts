import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * CampusFind brand: "lost-property office" palette — deep pine ink, signal teal for found items,
 * raspberry for lost, and the manila tag yellow used for item codes.
 */
export const CampusFindPreset = definePreset(Aura, {
  primitive: {
    pine: {
      50: '#eefaf7', 100: '#d3f2ea', 200: '#a9e4d6', 300: '#73cfbc', 400: '#41b39f',
      500: '#1f9e89', 600: '#167f6f', 700: '#14665b', 800: '#13524a', 900: '#12443e', 950: '#082824',
    },
  },
  semantic: {
    primary: {
      50: '{pine.50}', 100: '{pine.100}', 200: '{pine.200}', 300: '{pine.300}', 400: '{pine.400}',
      500: '{pine.500}', 600: '{pine.600}', 700: '{pine.700}', 800: '{pine.800}', 900: '{pine.900}', 950: '{pine.950}',
    },
    focusRing: { width: '2px', style: 'solid', color: '{primary.500}', offset: '2px' },
    formField: { borderRadius: '10px' },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff', 50: '#f6f8f9', 100: '#eef2f4', 200: '#e1e7ea', 300: '#c9d3d8', 400: '#9aa9b1',
          500: '#6d7f89', 600: '#4f616b', 700: '#3a4952', 800: '#26333b', 900: '#172128', 950: '#0d151a',
        },
      },
      dark: {
        surface: {
          0: '#ffffff', 50: '#eef3f5', 100: '#d5dfe4', 200: '#a9b9c1', 300: '#7d929d', 400: '#5b707b',
          500: '#41545e', 600: '#2f3f48', 700: '#22313a', 800: '#18242c', 900: '#111a21', 950: '#0a1116',
        },
      },
    },
  },
  components: {
    card: { root: { borderRadius: '16px' } },
    dialog: { root: { borderRadius: '16px' } },
    button: { root: { borderRadius: '10px' } },
  },
});
