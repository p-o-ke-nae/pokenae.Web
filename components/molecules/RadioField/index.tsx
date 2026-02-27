'use client';

import { useId } from "react";
import CustomRadioButton, {
	type CustomRadioButtonProps,
} from "@/components/atoms/CustomRadioButton";
import CustomLabel from "@/components/atoms/CustomLabel";

export type RadioFieldProps = CustomRadioButtonProps & {
	label: string;
	required?: boolean;
};

const RadioField = ({
	label,
	required = false,
	id,
	className = "",
	...rest
}: RadioFieldProps) => {
	const generatedId = useId();
	const inputId = id ?? generatedId;

	return (
		<>
			<div className={`radio-field ${className}`}>
				<CustomRadioButton id={inputId} {...rest} />
				<CustomLabel htmlFor={inputId} required={required}>
					{label}
				</CustomLabel>
			</div>

			<style jsx>{`
				.radio-field {
					display: inline-flex;
					align-items: center;
					gap: 0.5rem;
				}
			`}</style>
		</>
	);
};

RadioField.displayName = "RadioField";

export default RadioField;
