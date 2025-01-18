import { MedievalSharp } from "next/font/google";
import { useDnDStore } from "@/stores/useStore";

const medievalFont = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
});

const LoginPage = () => {
  const { setIsLoggedIn } = useDnDStore();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-8 -mt-[20vh]">
        <h1 className={`${medievalFont.className} text-8xl text-red-500`}>
          D&D Solo
        </h1>
        <button
          onClick={() => setIsLoggedIn(true)}
          className="btn  btn-lg font-bold"
        >
          Start the Adventure
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
