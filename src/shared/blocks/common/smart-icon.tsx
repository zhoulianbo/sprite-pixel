import { configuredIcons } from './icon-registry';

export function SmartIcon({
  name,
  size = 24,
  className,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  [key: string]: any;
}) {
  const IconComponent = Object.prototype.hasOwnProperty.call(
    configuredIcons,
    name
  )
    ? configuredIcons[name]
    : configuredIcons[name?.startsWith('Ri') ? 'RiQuestionLine' : 'HelpCircle'];

  return <IconComponent size={size} className={className} {...props} />;
}
