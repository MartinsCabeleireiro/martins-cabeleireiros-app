import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { LogoMark } from "@/components/Logo";
import { useLogo } from "@/lib/logo";

export const HeroEmblem = ({ className = "" }) => {
  const { url } = useLogo();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 120, damping: 14 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      data-testid="hero-logo-emblem"
      onMouseMove={onMove}
      onMouseLeave={reset}
      initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative aspect-square [perspective:900px] ${className}`}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry }} className="relative h-full w-full [transform-style:preserve-3d]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.22)_0%,rgba(212,175,55,0.04)_45%,transparent_70%)] blur-xl" />
        <svg viewBox="0 0 300 300" className="spin-slow absolute inset-0 h-full w-full text-[#D4AF37]">
          <defs><path id="ring" d="M150,150 m-122,0 a122,122 0 1,1 244,0 a122,122 0 1,1 -244,0" /></defs>
          <text className="font-caps" fill="currentColor" fontSize="15" letterSpacing="7.4">
            <textPath href="#ring">MARTINS CABELEIREIRO • BARBEARIA • SALÃO • </textPath>
          </text>
        </svg>
        <div className="absolute inset-[18%] grid place-items-center rounded-full border border-[#D4AF37]/40 bg-[#0D0D0F]/70 shadow-[0_0_80px_rgba(212,175,55,0.18)] backdrop-blur-md [transform:translateZ(40px)]">
          {url ? <img src={url} alt="Logo Martins Cabeleireiro" className="h-[70%] w-[70%] object-contain" /> : <LogoMark className="h-[58%] w-[58%] text-[#D4AF37]" />}
        </div>
      </motion.div>
    </motion.div>
  );
};
