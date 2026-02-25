import {
    Box, Button, Card, Container, Typography, Alert, CircularProgress, IconButton, Paper, Stack
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Calendar, ChevronLeft, ChevronRight, Plus, Minus, RotateCcw, Save, ShieldAlert
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { supabase } from 'lib/supabaseClient';

export default function SubmitKeyRequest() {
    const { user, isDark } = useOutletContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [wednesdayOffset, setWednesdayOffset] = useState(0);
    const [existingRequestId, setExistingRequestId] = useState(null);

    const [formData, setFormData] = useState({
        single_team_amount: 0,
        two_team_amount: 0,
        company_amount: 0,
        range_start: '',
        range_end: ''
    });

    const THEME_COLOR = '#10b981';
    const UPDATE_COLOR = '#3b82f6';

    // בדיקת הרשאות גישה
    const isAdmin = user?.roles?.includes('מנהל');
    const isBattalionCommander = user?.roles?.includes('קה״ד גדודי');
    const hasAccess = isAdmin || isBattalionCommander;

    // בדיקת הרשאות בטעינה ראשונית
    useEffect(() => {
        if (!user) return;
        if (!hasAccess) {
            navigate('/home');
            return;
        }
    }, [user, hasAccess, navigate]);

    const getNextWednesday = (weeks) => {
        if (weeks >= 0) {
            // לוגיקה מקורית - רביעי בעוד שבועיים+
            const d = new Date();
            d.setDate(d.getDate() + (14 + (weeks * 7)));
            d.setDate(d.getDate() + (3 - d.getDay() + 7) % 7 || 7);
            return d;
        } else {
            // חזרה אחורה לצפייה בלבד
            const d = new Date();
            const day = d.getDay();
            const daysUntilWednesday = (3 - day + 7) % 7 || 7;
            d.setDate(d.getDate() + daysUntilWednesday + (weeks * 7));
            return d;
        }
    };

    const fetchExistingRequest = useCallback(async (date) => {
        if (!user?.group_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('keys_request')
                .select('id, single_team_amount, two_team_amount, company_amount, status, assigned_small_rooms, assigned_dotz_rooms, assigned_large_rooms, missing_rooms')
                .eq('requester', user.group_id)
                .eq('range_start', date)
                .maybeSingle(); // הסרנו את הפילטר של status='pending'

            if (error) throw error;

            if (data) {
                setExistingRequestId(data.id);
                setFormData(prev => ({
                    ...prev,
                    single_team_amount: data.single_team_amount,
                    two_team_amount: data.two_team_amount,
                    company_amount: data.company_amount,
                    status: data.status,
                    assigned_small_rooms: data.assigned_small_rooms,
                    assigned_dotz_rooms: data.assigned_dotz_rooms,
                    assigned_large_rooms: data.assigned_large_rooms,
                    missing_rooms: data.missing_rooms
                }));
            } else {
                setExistingRequestId(null);
                setFormData(prev => ({
                    ...prev,
                    single_team_amount: 0,
                    two_team_amount: 0,
                    company_amount: 0,
                    status: null,
                    assigned_small_rooms: 0,
                    assigned_dotz_rooms: 0,
                    assigned_large_rooms: 0,
                    missing_rooms: 0
                }));
            }
        } catch (err) {
            console.error("Error fetching request:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.group_id]);

    useEffect(() => {
        if (!hasAccess) return;

        const targetWednesday = getNextWednesday(wednesdayOffset);
        const dateStr = targetWednesday.toISOString().split('T')[0];

        // איפוס הודעות במעבר בין שבועות
        setSubmitSuccess(false);
        setError(null);

        setFormData(prev => ({ ...prev, range_start: dateStr, range_end: dateStr }));
        fetchExistingRequest(dateStr);
    }, [wednesdayOffset, fetchExistingRequest, hasAccess]);

    const handleOffsetChange = (delta) => {
    setWednesdayOffset(prev => prev + delta);
};

    const fetchAncestorGroup = async (startGroupId, targetTypeName) => {
        const { data } = await supabase.rpc('get_parent_group_by_type', {
            start_group_id: startGroupId,
            target_type_name: targetTypeName
        });
        return data?.[0] || null;
    };

    const updateAmount = (field, delta) => {
        setFormData(prev => ({
            ...prev,
            [field]: Math.max(0, prev[field] + delta)
        }));
        setSubmitSuccess(false); // ברגע שמשנים ערך, הודעת ההצלחה הקודמת נעלמת
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSubmitSuccess(false);
        if (wednesdayOffset < 0) {
            setError('לא ניתן לשלוח בקשה לתאריך שעבר');
            return;
        }

        try {
            const totalRooms = formData.single_team_amount + formData.two_team_amount + formData.company_amount;
            if (totalRooms === 0) throw new Error('יש לבקש לפחות כיתה אחת');

            const battalionGroup = await fetchAncestorGroup(user.group_id, 'Battalion');
            const requesteeId = battalionGroup ? battalionGroup.id : user.group_id;

            const payload = {
                requester: user.group_id,
                requestee: requesteeId,
                single_team_amount: formData.single_team_amount,
                two_team_amount: formData.two_team_amount,
                company_amount: formData.company_amount,
                range_start: formData.range_start,
                range_end: formData.range_end,
                status: 'pending'
            };

            let res;
            if (existingRequestId) {
                res = await supabase.from('keys_request').update(payload).eq('id', existingRequestId);
            } else {
                res = await supabase.from('keys_request').insert(payload).select('id').single();
                if (res.data) setExistingRequestId(res.data.id);
            }

            if (res.error) throw res.error;
            setSubmitSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalRooms = formData.single_team_amount + formData.two_team_amount + formData.company_amount;

    const InputRow = ({ label, field }) => (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: '24px', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fcfcfd',
            border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: '0.2s',
            '&:hover': { borderColor: existingRequestId ? UPDATE_COLOR : THEME_COLOR }
        }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <IconButton onClick={() => updateAmount(field, -1)}
                    disabled={wednesdayOffset < 0}
                    sx={{ border: '2px solid', borderColor: 'divider', width: 42, height: 42 }}>
                    <Minus size={20} />
                </IconButton>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, minWidth: '40px', textAlign: 'center' }}>{formData[field]}</Typography>
                <IconButton
                    onClick={() => updateAmount(field, 1)}
                    disabled={wednesdayOffset < 0}

                    sx={{ bgcolor: existingRequestId ? UPDATE_COLOR : THEME_COLOR, color: 'white', width: 42, height: 42, '&:hover': { opacity: 0.9 } }}
                >
                    <Plus size={20} />
                </IconButton>
            </Box>
        </Paper>
    );

    // מסך טעינה
    if (!user) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // מסך חוסר הרשאה
    if (!hasAccess) {
        return (
            <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
                <ShieldAlert size={64} color="#ef4444" />
                <Typography variant="h5" sx={{ mt: 2, fontWeight: 700, color: isDark ? 'white' : '#1e293b' }}>
                    אין הרשאת גישה
                </Typography>
                <Typography sx={{ mt: 1, color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
                    דף זה מיועד למנהלים וקה"ד גדודי בלבד
                </Typography>
            </Container>
        );
    }
    // מסך בקשה מאושרת
    if (formData.status === 'approved') {
        const totalRequested = formData.single_team_amount + formData.two_team_amount + formData.company_amount;
        const totalAssigned = (formData.assigned_small_rooms || 0) + (formData.assigned_dotz_rooms || 0) + (formData.assigned_large_rooms || 0);

        return (
            <Container maxWidth="sm" sx={{ py: 6, direction: 'rtl' }}>
                <Box sx={{ textAlign: 'center', mb: 5 }}>
                    <Typography variant="h3" sx={{ fontWeight: 950, mb: 1 }}>בקשת מפתחות</Typography>
                </Box>

                {/* בורר תאריך */}
                <Card sx={{
                    p: 1.5, borderRadius: '24px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', bgcolor: isDark ? '#1a1a2e' : '#f8fafc',
                    border: '1px solid', borderColor: '#10b981', mb: 5
                }}>
                    <IconButton onClick={() => handleOffsetChange(-1)}>
                        <ChevronRight size={28} />
                    </IconButton>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981', display: 'block', mb: 0.5 }}>יום רביעי</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {new Date(formData.range_start).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                    </Box>
                    <IconButton onClick={() => handleOffsetChange(1)} sx={{ color: '#10b981' }}>
                        <ChevronLeft size={28} />
                    </IconButton>
                </Card>

                {wednesdayOffset !== 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                        <Button
                            size="small"
                            startIcon={<RotateCcw size={14} />}
                            onClick={() => setWednesdayOffset(0)}
                            sx={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}
                        >
                            חזור לרביעי הנוכחי
                        </Button>
                    </Box>
                )}


                {/* כרטיס אישור */}
                <Paper elevation={0} sx={{
                    p: 4, borderRadius: '28px', textAlign: 'center',
                    border: '2px solid #10b981',
                    bgcolor: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.03)',
                    mb: 3
                }}>
                    <Typography sx={{ fontSize: '3rem', mb: 1 }}>✅</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#10b981', mb: 3 }}>
                        הבקשה אושרה!
                    </Typography>

                    <Stack spacing={2}>
                        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
                            <Typography sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>כיתות צוותיות</Typography>
                            <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>
                                {formData.single_team_amount} / <span style={{ color: '#10b981' }}>{formData.assigned_small_rooms || 0}</span>
                            </Typography>
                        </Paper>

                        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
                            <Typography sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>כיתות דו-צוותיות</Typography>
                            <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>
                                {formData.two_team_amount} / <span style={{ color: '#10b981' }}>{formData.assigned_dotz_rooms || 0}</span>
                            </Typography>
                        </Paper>

                        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
                            <Typography sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>כיתות פלוגתיות</Typography>
                            <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>
                                {formData.company_amount} / <span style={{ color: '#10b981' }}>{formData.assigned_large_rooms || 0}</span>
                            </Typography>
                        </Paper>

                        {/* סיכום */}
                        <Paper elevation={0} sx={{
                            p: 2.5, borderRadius: '16px',
                            bgcolor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
                            border: '1px solid #10b981'
                        }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                                סה״כ התקבלו: {totalRequested} / <span style={{ color: '#10b981', fontSize: '1.4rem' }}>{totalAssigned}</span>
                            </Typography>
                            {formData.missing_rooms > 0 && (
                                <Typography sx={{ fontWeight: 700, color: '#ef4444', mt: 1 }}>
                                    ⚠️ חסרות {formData.missing_rooms} כיתות
                                </Typography>
                            )}
                        </Paper>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ py: 6, direction: 'rtl' }}>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
                <Typography variant="h3" sx={{ fontWeight: 950, mb: 1 }}>בקשת מפתחות</Typography>
                <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {existingRequestId ? 'עריכת בקשה קיימת' : 'הגשת בקשה חדשה'}
                </Typography>
            </Box>

            <Box sx={{ position: 'relative', mb: 7 }}>
                <Card sx={{
                    p: 1.5, borderRadius: '24px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', bgcolor: isDark ? '#1a1a2e' : '#f8fafc',
                    border: '1px solid', borderColor: existingRequestId ? UPDATE_COLOR : THEME_COLOR,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}>
                    <IconButton onClick={() => handleOffsetChange(-1)}>
                        <ChevronRight size={28} />
                    </IconButton>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: existingRequestId ? UPDATE_COLOR : THEME_COLOR, display: 'block', mb: 0.5 }}>יום רביעי</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {new Date(formData.range_start).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                    </Box>
                    <IconButton onClick={() => handleOffsetChange(1)} sx={{ color: existingRequestId ? UPDATE_COLOR : THEME_COLOR }}>
                        <ChevronLeft size={28} />
                    </IconButton>
                </Card>
                {wednesdayOffset !== 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                        <Button
                            size="small"
                            startIcon={<RotateCcw size={14} />}
                            onClick={() => setWednesdayOffset(0)}
                            sx={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}
                        >
                            חזור לרביעי הנוכחי
                        </Button>
                    </Box>
                )}
            </Box>

            <Stack spacing={2.5} sx={{ mb: 6 }}>
                <InputRow label="כיתות צוותיות" field="single_team_amount" />
                <InputRow label="כיתות דו-צוותיות" field="two_team_amount" />
                <InputRow label="כיתות פלוגתיות" field="company_amount" />
            </Stack>

            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>סה"כ מפתחות לשריון</Typography>
                <Typography variant="h2" sx={{ fontWeight: 650, color: totalRooms > 0 ? (existingRequestId ? UPDATE_COLOR : THEME_COLOR) : 'divider', lineHeight: 0.8 }}>
                    {totalRooms}
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '16px' }}>{error}</Alert>}

            <AnimatePresence>
                {submitSuccess && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Alert severity="success" sx={{ mb: 3, borderRadius: '16px', bgcolor: existingRequestId ? UPDATE_COLOR : THEME_COLOR, color: 'white' }}>
                            {existingRequestId ? 'הבקשה עודכנה בהצלחה!' : 'הבקשה נשלחה בהצלחה!'}
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                fullWidth variant="contained" disabled={loading || totalRooms === 0}
                onClick={handleSubmit}
                startIcon={existingRequestId ? <Save size={20} /> : <Send size={20} />}
                sx={{
                    py: 2.0, borderRadius: '24px', fontSize: '1.25rem', fontWeight: 700,
                    background: existingRequestId ? `linear-gradient(135deg, ${UPDATE_COLOR} 0%, #2563eb 100%)` : `linear-gradient(135deg, ${THEME_COLOR} 0%, #059669 100%)`,
                    boxShadow: existingRequestId ? `0 12px 30px rgba(59, 130, 246, 0.3)` : `0 12px 30px ${THEME_COLOR}40`,
                }}
            >
                {loading ? <CircularProgress size={28} color="inherit" /> : (existingRequestId ? 'עדכן בקשה' : 'שלח בקשה')}
            </Button>
        </Container>
    );
}