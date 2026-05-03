import { Group } from '@mantine/core';
import { IconStar } from '@tabler/icons-react';

export function StarRating({ rating, size = 16 }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<IconStar key={i} size={size} color="#fcc419" fill="#fcc419" />);
    } else if (i === fullStars && hasHalfStar) {
      // Упрощение: рисуем полную звезду желтым, но можно сделать половину через CSS mask
      stars.push(<IconStar key={i} size={size} color="#fcc419" fill="#fcc419" style={{ opacity: 0.5 }} />);
    } else {
      stars.push(<IconStar key={i} size={size} color="#e9ecef" />);
    }
  }

  return <Group gap={2}>{stars}</Group>;
}