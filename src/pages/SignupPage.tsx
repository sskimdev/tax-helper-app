// src/pages/SignupPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';

export function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // 가입 확인 메일 안내
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      // Supabase 설정에서 이메일 확인(Email Confirmation)이 활성화되어 있어야 합니다.
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        // options: {
        //   data: {
        //     // 추가적인 사용자 메타데이터 (예: 이름, 역할 등) - 프로필 테이블에 저장하는 것이 일반적
        //     // full_name: '홍길동',
        //     // user_role: 'client', // 사용자 역할 지정 예시 (프로필 테이블과 연동 필요)
        //   }
        // }
      });
      if (error) throw error;

      // 이메일 확인이 활성화된 경우
      if (data.user && data.user.identities && data.user.identities.length === 0) {
         // 이 경우는 보통 이메일이 이미 존재하지만 확인되지 않았을 때 나타날 수 있음 (Supabase 최신 동작 확인 필요)
         setMessage("가입은 되었으나 이메일 확인이 필요합니다. 이미 가입된 이메일일 수 있습니다.");
      } else if (data.session === null && data.user) { // 혹은 data.user.email_confirmed_at === null
         setMessage("가입 확인 메일이 발송되었습니다. 이메일을 확인해주세요.");
      } else {
         // 이메일 확인이 비활성화되었거나, 바로 세션이 생성되는 경우
         // navigate('/'); // 자동 로그인 후 홈으로 이동 (또는 로그인 페이지로)
         setMessage("회원가입이 완료되었습니다. 로그인해주세요.");
         navigate('/login'); // 로그인 페이지로 리디렉션
      }

    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>새 계정을 만들기 위해 정보를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="6자 이상 입력"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-green-500">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm">
          이미 계정이 있으신가요? <Link to="/login" className="ml-1 underline">로그인</Link>
        </CardFooter>
      </Card>
    </div>
  );
}