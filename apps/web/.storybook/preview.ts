import type { Preview } from '@storybook/react-vite';
import '../src/app/styles/index.css';

document.documentElement.classList.add('dark');

const preview: Preview = {
  parameters: {
    layout: 'padded',
  },
};

export default preview;
