// Support css-modules `import * as "./path-to-file/style.css"`
declare module '*.module.css' {
  const content: Record<string, string>;
  export = content;
}

declare module "*.svg" {
  const content: string;
  export = content; // base64 data-url, see also `webpack.config.ts`
}
