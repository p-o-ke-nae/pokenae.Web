'use client';

import { useId } from "react";
import CustomRadioButton, {
	type CustomRadioButtonProps,
} from "@/components/atoms/CustomRadioButton";
import CustomLabel from "@/components/atoms/CustomLabel";

export type CustomRadioButtonWithLabelProps = CustomRadioButtonProps & {
	label: string;
	required?: boolean;
};

const CustomRadioButtonWithLabel = ({
	label,
	required = false,
	id,
	className = "",
	...rest
}: CustomRadioButtonWithLabelProps) => {
	const generatedId = useId();
	const inputId = id ?? generatedId;

	return (
		<>
			<div className={`custom-radio-field ${className}`}>
				<CustomRadioButton id={inputId} {...rest} />
				<CustomLabel htmlFor={inputId} required={required}>
					{label}
				</CustomLabel>
			</div>

			<style jsx>{`
				.custom-radio-field {
					display: inline-flex;
					align-items: center;
					gap: 0.5rem;
				}
			`}</style>
		</>
	);
};

CustomRadioButtonWithLabel.displayName = "CustomRadioButtonWithLabel";

export default CustomRadioButtonWithLabel;
