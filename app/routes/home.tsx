import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";
import {APP_CONFIG} from "~/config";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    // Only redirect to auth if not authenticated AND Puter KV is enabled
    if (APP_CONFIG.PUTER_KV_ENABLED && !auth.isAuthenticated) {
      navigate('/auth?next=/');
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);
      const parsedResumes: Resume[] = [];

      // 1. Primary: Load locally persisted resumes from localStorage
      if (APP_CONFIG.LOCAL_STORAGE_ENABLED && typeof window !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('resume:')) {
              const val = localStorage.getItem(key);
              if (val) {
                parsedResumes.push(JSON.parse(val) as Resume);
              }
            }
          }
        } catch (e) {
          console.warn("[HOME] Local storage read error:", e);
        }
      }

      // 2. Secondary: If Puter KV is enabled, merge cloud resumes
      if (APP_CONFIG.PUTER_KV_ENABLED) {
        try {
          const cloudResumes = (await kv.list('resume:*', true)) as KVItem[];
          if (cloudResumes) {
            cloudResumes.forEach((item) => {
              try {
                const parsed = JSON.parse(item.value) as Resume;
                if (!parsedResumes.some(r => r.id === parsed.id)) {
                  parsedResumes.push(parsed);
                }
              } catch (parseErr) {}
            });
          }
        } catch (kvErr) {
          console.warn("[HOME] Puter kv.list notice:", kvErr);
        }
      }

      setResumes(parsedResumes);
      setLoadingResumes(false);
    };

    loadResumes();
  }, []);

  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
    <Navbar />

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>
        {!loadingResumes && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
        ): (
          <h2>Review your submissions and check AI-powered feedback.</h2>
        )}
      </div>
      {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" alt="Scanning" />
          </div>
      )}

      {!loadingResumes && resumes.length > 0 && (
        <div className="resumes-section">
          {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}

      {!loadingResumes && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
      )}
    </section>
  </main>
}
