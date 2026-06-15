/** @type {import("prettier").Config} */
export default {
  plugins: ["@trivago/prettier-plugin-sort-imports"],

  importOrder: ["^@/(.*)$", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
