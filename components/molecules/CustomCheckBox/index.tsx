'use client';

import { forwardRef, useId } from "react";
import CustomCheckBox, {
	type CustomCheckBoxProps,
} from "@/components/atoms/CustomCheckBox";
import CustomLabel from "@/components/atoms/CustomLabel";

export type CustomCheckBoxWithLabelProps = CustomCheckBoxProps & {
	label: string;
	required?: boolean;
};

const CustomCheckBoxWithLabel = forwardRef<
	HTMLInputElement,
	CustomCheckBoxWithLabelProps
>(({ label, required = false, id, className = "", ...rest }, ref) => {
	const generatedId = useId();
	const inputId = id ?? generatedId;

	return (
		<>
			<div className={`custom-checkbox-field ${className}`}>
				<CustomCheckBox ref={ref} id={inputId} {...rest} />
				<CustomLabel htmlFor={inputId} required={required}>
					{label}
				</CustomLabel>
			</div>

			<style jsx>{`
				.custom-checkbox-field {
					display: inline-flex;
					align-items: center;
					gap: 0.5rem;
				}
			`}</style>
		</>
	);
});

CustomCheckBoxWithLabel.displayName = "CustomCheckBoxWithLabel";

export default CustomCheckBoxWithLabel;
