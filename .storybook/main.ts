import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions', 'storybook-dark-mode'],
    framework: {
        name: '@storybook/nextjs',
        options: {},
    },
    docs: {
        autodocs: true,
    },
    staticDirs: ['../public'],
};

export default config;
