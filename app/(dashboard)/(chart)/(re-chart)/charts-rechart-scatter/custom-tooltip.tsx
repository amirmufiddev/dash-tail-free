const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name?: string; value?: number | string; color?: string; fill?: string; dataKey?: string | number; payload?: Record<string, string | number> }[] }) => {
    if (active && payload) {
        return (
            <div className="bg-slate-900 text-primary-foreground p-3 rounded-md space-x-2 rtl:space-x-reverse ">
                <span>{`${payload[0].name}`}</span>
                <span>:</span>
                <span>{`${payload[0].value}%`}</span>
            </div>
        );
    }

    return null;
};

export default CustomTooltip