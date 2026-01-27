import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0F7FF] font-sans">
      <main className="flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-10 px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.svg"
            alt="마이에브리씽 로고"
            width={80}
            height={80}
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight text-[#2E6BA8] sm:text-3xl">
            마이에브리씽
          </h1>
          <p className="max-w-sm text-center text-base leading-relaxed text-[#5B8BB5]">
            나의 모든 것을 기록하는 앱
          </p>
        </div>
      </main>
    </div>
  );
}
