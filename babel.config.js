module.exports = function (api) {
  switch (api.env()) {
  case 'production':
    return {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: '8',
            },
          },
        ],
        '@babel/preset-typescript',
      ],
    }
  case 'test': {
    return {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: '8',
            },
          },
        ],
        '@babel/preset-typescript',
      ],
      plugins: [
        'istanbul',
      ],
      sourceMaps: true,
      retainLines: true,
    }
  }
  }
}
