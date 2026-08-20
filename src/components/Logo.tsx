import logo from "@/assets/logo.png";

export function Logo({ height = 22 }: { height?: number }) {
  return <img src={logo} alt="CropSight" style={{ height }} />;
}
