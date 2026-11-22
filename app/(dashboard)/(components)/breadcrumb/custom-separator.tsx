import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/breadcrumbs";
const CustomSeparator = () => {
  return (
    <>
      <Breadcrumbs separator="/">
        <BreadcrumbItem>Button</BreadcrumbItem>
        <BreadcrumbItem>Breadcrumbs</BreadcrumbItem>
        <BreadcrumbItem>Card</BreadcrumbItem>
        <BreadcrumbItem>Checkbox</BreadcrumbItem>
        <BreadcrumbItem>Code</BreadcrumbItem>
      </Breadcrumbs>
    </>
  );
};

export default CustomSeparator;
