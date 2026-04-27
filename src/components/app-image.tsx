import type { ImgHTMLAttributes } from "react";
import { forwardRef } from "react";

type AppImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
};

const AppImage = forwardRef<HTMLImageElement, AppImageProps>(function AppImage(
  { src, alt, width, height, fill, style, loading, ...props },
  ref,
) {
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading ?? "lazy"}
      style={
        fill
          ? { ...style, width: "100%", height: "100%", objectFit: "cover" }
          : style
      }
      {...props}
    />
  );
});

export default AppImage;
