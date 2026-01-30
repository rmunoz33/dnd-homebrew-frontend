import { MedievalSharp, EB_Garamond } from "next/font/google";
import { useDnDStore } from "@/stores/useStore";

const medievalFont = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
});

const garamondFont = EB_Garamond({
  weight: ["400"],
  subsets: ["latin"],
});

const LoginPage = () => {
  const { setIsLoggedIn } = useDnDStore();

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(120, 30, 20, 0.25) 0%, rgba(10, 10, 10, 0.95) 70%, #0a0a0a 100%)",
      }}
    >
      <div className="flex flex-col items-center -mt-[12vh]">
        <h1
          className={`${medievalFont.className} text-5xl sm:text-7xl md:text-8xl text-amber-200 text-glow-gold animate-fade-in-up text-center`}
        >
          Fables & Sagas
        </h1>

        <p
          className={`${garamondFont.className} text-sm sm:text-lg tracking-[0.3em] uppercase text-amber-100/50 mt-3 animate-fade-in-up-delay-1`}
        >
          A Solo Adventure
        </p>

        <div className="flex items-center gap-3 mt-8 mb-10 animate-fade-in-up-delay-2 text-amber-200/20">
          <span className="block w-12 h-px bg-current" />
          <span className="text-xs">&#x2756;</span>
          <span className="block w-12 h-px bg-current" />
        </div>

        <button
          onClick={() => setIsLoggedIn(true)}
          className="animate-fade-in-up-delay-3 btn btn-outline btn-lg uppercase tracking-widest font-bold border-amber-200/30 text-amber-100/80 hover:bg-amber-200/10 hover:border-amber-200/50 hover:text-amber-100 transition-all duration-300"
        >
          Start the Adventure
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
