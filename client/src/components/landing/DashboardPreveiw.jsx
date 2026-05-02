import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <div className="w-full flex justify-center px-2 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1400px] rounded-2xl border overflow-hidden shadow-xl bg-white"
      >
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 border-b">
          <div className="w-2 h-2 bg-red-400 rounded-full" />
          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
          <div className="w-2 h-2 bg-green-400 rounded-full" />
        </div>

        {/* Image */}
        <div className="w-full bg-gray-50 flex items-center justify-center
                        h-[260px] sm:h-[320px] md:h-[420px] lg:h-[500px]">
          <img
            src="/dashboard.png"
            alt="Dashboard Preview"
            className="w-full h-full object-contain"
          />
        </div>
      </motion.div>
    </div>
  );
}