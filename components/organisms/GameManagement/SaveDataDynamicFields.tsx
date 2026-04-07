'use client';

import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import type { SaveDataSchemaDto } from '@/lib/game-management/types';

type Props = {
  schema: SaveDataSchemaDto | null;
  values: Record<string, string>;
  onChange: (fieldKey: string, value: string) => void;
  loading: boolean;
  error: string | null;
  displayOnly?: boolean;
};

function FieldHint({ description, required }: { description: string | null; required: boolean }) {
  if (!description && !required) {
    return null;
  }

  return (
    <p className="select-none text-xs leading-5 text-zinc-500 dark:text-zinc-400">
      {required ? '必須項目です。' : null}
      {required && description ? ' ' : null}
      {description ?? ''}
    </p>
  );
}

export default function SaveDataDynamicFields({ schema, values, onChange, loading, error, displayOnly = false }: Props) {
  if (loading) {
    return <p className="text-sm text-zinc-500">可変項目を読み込んでいます...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  }

  if (!schema) {
    return <p className="text-sm text-zinc-500">ゲームソフトを選択すると可変項目を表示します。</p>;
  }

  const visibleFields = schema.fields.filter((field) => !field.isDisabled);

  if (visibleFields.length === 0) {
    return <p className="text-sm text-zinc-500">このゲームソフトに追加の可変項目はありません。</p>;
  }

  return (
    <div className="space-y-5">
      {visibleFields.map((field) => {
        const value = values[field.fieldKey] ?? '';
        return (
          <div key={field.fieldKey} className="space-y-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="space-y-1">
              <CustomLabel htmlFor={`dynamic-${field.fieldKey}`}>{field.label}</CustomLabel>
              <FieldHint description={field.description} required={field.isRequired} />
            </div>
            {field.fieldType === 0 ? (
              <CustomTextBox
                id={`dynamic-${field.fieldKey}`}
                value={value}
                onChange={(event) => onChange(field.fieldKey, event.target.value)}
                placeholder={field.label}
                displayOnly={displayOnly}
              />
            ) : null}
            {field.fieldType === 1 ? (
              <CustomTextArea
                id={`dynamic-${field.fieldKey}`}
                value={value}
                onChange={(event) => onChange(field.fieldKey, event.target.value)}
                placeholder={field.label}
                displayOnly={displayOnly}
              />
            ) : null}
            {field.fieldType === 2 ? (
              <CustomTextBox
                id={`dynamic-${field.fieldKey}`}
                type="number"
                step="1"
                value={value}
                onChange={(event) => onChange(field.fieldKey, event.target.value)}
                placeholder="0"
                displayOnly={displayOnly}
              />
            ) : null}
            {field.fieldType === 3 ? (
              <CustomTextBox
                id={`dynamic-${field.fieldKey}`}
                type="number"
                step="any"
                value={value}
                onChange={(event) => onChange(field.fieldKey, event.target.value)}
                placeholder="0.0"
                displayOnly={displayOnly}
              />
            ) : null}
            {field.fieldType === 4 ? (
              <label className={`inline-flex items-center gap-2${displayOnly ? '' : ' cursor-pointer'}`}>
                <CustomCheckBox
                  id={`dynamic-${field.fieldKey}`}
                  checked={value === 'true'}
                  onChange={(event) => onChange(field.fieldKey, event.target.checked ? 'true' : 'false')}
                  displayOnly={displayOnly}
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{value === 'true' ? 'はい' : 'いいえ'}</span>
              </label>
            ) : null}
            {field.fieldType === 5 ? (
              <CustomTextBox
                id={`dynamic-${field.fieldKey}`}
                type="date"
                value={value}
                onChange={(event) => onChange(field.fieldKey, event.target.value)}
                displayOnly={displayOnly}
              />
            ) : null}
            {field.fieldType === 6 ? (
              <CustomComboBox id={`dynamic-${field.fieldKey}`} value={value} onChange={(event) => onChange(field.fieldKey, event.target.value)} displayOnly={displayOnly}>
                <option value="">未選択</option>
                {field.options.map((option) => (
                  <option key={option.optionKey} value={option.optionKey}>
                    {option.label}
                  </option>
                ))}
              </CustomComboBox>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}