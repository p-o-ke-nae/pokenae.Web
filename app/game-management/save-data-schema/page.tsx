import SaveDataSchemaManager from '@/components/organisms/SaveDataSchemaManager';
import { getSaveDataSchemaManagerTexts } from '@/lib/resources/game-management-pages';

export default function SaveDataSchemaManagementPage() {
  return <SaveDataSchemaManager texts={getSaveDataSchemaManagerTexts('ja')} />;
}