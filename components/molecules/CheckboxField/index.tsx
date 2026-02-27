'use client';

import { useId } from "react";
import CustomCheckBox, {
	type CustomCheckBoxProps,
} from "@/components/atoms/CustomCheckBox";
import CustomLabel from "@/components/atoms/CustomLabel";

export type CheckboxFieldProps = CustomCheckBoxProps & {
	label: string;
	required?: boolean;
};

const CheckboxField = ({
	label,
	required = false,
	id,
	className = "",
	...rest
}: CheckboxFieldProps) => {
	const generatedId = useId();
	const inputId = id ?? generatedId;

	return (
		<>
			<div className={`checkbox-field ${className}`}>
				<CustomCheckBox id={inputId} {...rest} />
				<CustomLabel htmlFor={inputId} required={required}>
					{label}
				</CustomLabel>
			</div>

			<style jsx>{`
				.checkbox-field {
					display: inline-flex;
					align-items: center;
					gap: 0.5rem;
				}
			`}</style>
		</>
	);
};

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
