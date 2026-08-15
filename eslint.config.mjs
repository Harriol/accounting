import { react } from 'eslint-config-ali';

// 强制每个源代码文件头部包含作者名（eslint-plugin-header 缺少 schema 与 ESLint 9 不兼容，
// 改用 ESLint 官方 inline 规则实现同等功能，支持 --fix 自动补充）
const authorHeaderRule = {
  meta: {
    type: 'layout',
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const { sourceCode } = context;
        const firstComment = sourceCode.getAllComments()[0];
        const hasAuthor = firstComment && /@author\s+Harriol/.test(firstComment.value);

        if (!hasAuthor) {
          context.report({
            node,
            message: '文件头缺少 @author Harriol 作者声明',
            fix(fixer) {
              return fixer.insertTextBeforeRange([0, 0], '/**\n * @author Harriol\n */\n');
            },
          });
        }
      },
    };
  },
};

export default [
  {
    ignores: ['node_modules/**', 'out/**', 'dist/**', 'coverage/**', 'tests/**', '**/*.d.ts'],
  },
  ...react,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      header: {
        rules: {
          header: authorHeaderRule,
        },
      },
    },
    rules: {
      'header/header': 'error',
    },
  },
  {
    // 允许 console.warn / console.error（错误日志），仅警告调试用的 console.log
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // 构建脚本用 console.log 输出进度是合理的，不限制
    files: ['scripts/**/*.cjs'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // 允许事件处理器的函数引用与内联箭头函数（React 标准模式），仅禁止 .bind()
    rules: {
      'react/jsx-no-bind': ['warn', { allowFunctions: true, allowArrowFunctions: true }],
    },
  },
];
