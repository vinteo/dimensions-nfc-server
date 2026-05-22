interface NotificationsProps {
  errorMsg: string | null;
  successMsg: string | null;
}

export default function Notifications({ errorMsg, successMsg }: NotificationsProps) {
  return (
    <>
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800/80 text-rose-200 px-4 py-3 rounded-lg flex items-center gap-3 backdrop-blur-md animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 px-4 py-3 rounded-lg flex items-center gap-3 backdrop-blur-md animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}
    </>
  );
}
