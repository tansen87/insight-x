/** 右键菜单项；key 省略时渲染为分隔线 */
export interface ContextMenuItem {
  key?: string;
  label?: string;
  icon?: any;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}
