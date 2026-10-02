import { UI_ICONS } from '../lib/uiIcons'

// Goldenes Icon im Fließtext, z. B. <Icon name="standort"/> statt 📍
// Namen: standort, person, globus, stern, karte, korb, tropfen, brief
export default function Icon({ name, size = 14, style }) {
  return (
    <span style={{ display: 'inline-flex', verticalAlign: '-0.15em', ...style }}>
      <img src={UI_ICONS[name]} alt="" width={size} height={size} style={{ display: 'block', width: size, height: size }} />
    </span>
  )
}
