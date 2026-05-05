/**
 * UI とエラーメッセージの統合リソース入口。
 * 利用側は原則このファイルを入口として参照し、内部では責務別モジュールへ分割する。
 */

import { apiErrorResources } from './api-errors';
import { gameManagementResources } from './game-management';
import { uiResources } from './ui';

const resources = {
  ...uiResources,
  apiError: apiErrorResources,
  gameManagement: gameManagementResources,
} as const;

export default resources;

export { apiErrorResources, gameManagementResources, uiResources };
