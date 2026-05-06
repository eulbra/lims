"""Seed development and demo data for LIMS."""
import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Seed development and demo data for LIMS"

    def handle(self, *args, **options):
        from lims.apps.organizations.models import Site, Department
        from lims.apps.users.models import Role, UserRole
        from lims.apps.samples.models import SampleType, TestPanel, Sample
        from lims.apps.instruments.models import Instrument
        from lims.apps.reagents.models import Reagent, ReagentLot, InventoryTransaction
        from lims.apps.workflows.models import WorkflowProtocol, SampleRun, RunSample
        from lims.apps.qc.models import QCControlMaterial, QCChart
        from lims.apps.reports.models import ReportTemplate

        self.stdout.write(self.style.WARNING("=" * 60))
        self.stdout.write(self.style.WARNING("  NGS LIMS - Seed Data for Development"))
        self.stdout.write(self.style.WARNING("=" * 60))

        # 1. SITES
        self.stdout.write("\n[1/11] Creating sites...")
        for d in [
            {"code": "US-LA", "name_en": "Los Angeles Molecular Lab", "country": "US", "locale": "en", "timezone": "America/Los_Angeles", "cap_number": "CAP-12345", "clia_number": "05D2098765"},
            {"code": "CN-SH", "name_en": "Shanghai Genomics Center", "name_local": "上海基因组研究中心", "country": "CN", "locale": "zh", "timezone": "Asia/Shanghai"},
            {"code": "BR-SP", "name_en": "Sao Paulo Genetica Lab", "name_local": "Laboratorio Genetica Sao Paulo", "country": "BR", "locale": "pt", "timezone": "America/Sao_Paulo"},
            {"code": "TH-BK", "name_en": "Bangkok Precision Medicine Lab", "country": "TH", "locale": "th", "timezone": "Asia/Bangkok"},
            {"code": "HK",    "name_en": "Hong Kong Molecular Diagnostics", "name_local": "香港分子診斷中心", "country": "HK", "locale": "zh", "timezone": "Asia/Hong_Kong"},
        ]:
            site, created = Site.objects.get_or_create(code=d["code"], defaults=d)
            self.stdout.write(f"  {'+' if created else '='}  {site.code} - {site.name_en}")

        sites = {s.code: s for s in Site.objects.all()}

        # 2. ROLES
        self.stdout.write("\n[2/11] Creating roles...")
        for name, desc in [
            ("system_admin", "System Administrator"),
            ("site_director", "Site Director"),
            ("lab_manager", "Lab Manager"),
            ("qc_manager", "QC Manager"),
            ("technical_supervisor", "Technical Supervisor"),
            ("senior_technologist", "Senior Technologist"),
            ("technologist", "Technologist"),
            ("bioinformatician", "Bioinformatics Analyst"),
            ("auditor", "Auditor (Read-Only)"),
        ]:
            Role.objects.get_or_create(name=name, site=None, defaults={"description": desc, "is_system": True})
        roles = {r.name: r for r in Role.objects.filter(site__isnull=True)}

        # 3. USERS
        self.stdout.write("\n[3/11] Creating users...")
        admin, _ = User.objects.get_or_create(
            username="admin", defaults={
                "employee_id": "EMP-0001", "email": "admin@ngslims.dev",
                "first_name": "System", "last_name": "Administrator",
                "is_staff": True, "is_superuser": True, "is_active": True,
            }
        )
        admin.set_password("admin123")
        admin.save()
        self.stdout.write("  +  admin / admin123  (Super Admin)")

        for code, site in sites.items():
            prefix = code.lower().replace("-", "")[:6]
            for rn in ["site_director", "qc_manager", "technologist", "bioinformatician"]:
                uname = f"{prefix}_{rn[:4]}"
                user, created = User.objects.get_or_create(
                    username=uname, defaults={
                        "employee_id": f"EMP-{code}-{hash(uname) % 900 + 100:03d}",
                        "email": f"{rn}.{code}@ngslims.dev",
                        "first_name": f"{rn.replace('_', ' ').title()} {code}",
                        "last_name": f"Lab {code}",
                        "site": site, "is_staff": True, "is_active": True,
                        "locale": site.locale, "timezone": site.timezone,
                    }
                )
                if created:
                    user.set_password(f"{rn}123")
                    user.save()
                    UserRole.objects.get_or_create(user=user, role=roles[rn], site=site)
                    self.stdout.write(f"  +  {uname} / {rn}123  ({rn} @ {code})")

        # 4. SAMPLE TYPES
        self.stdout.write("\n[4/11] Creating sample types...")
        for code, name, tube, temp, retain in [
            ("PLASMA_CFDNA", "Maternal Plasma (cfDNA)", "Streck Cell-Free DNA BCT", "-80C", 365),
            ("CERVICAL_SWAB", "Cervical Swab (PreservCyt)", "PreservCyt Solution", "2-8C", 180),
            ("LBC", "Liquid-Based Cytology (SurePath)", "SurePath fluid", "2-8C", 180),
            ("WHOLE_BLOOD", "Whole Blood (EDTA)", "K2 EDTA Vacutainer", "-20C", 365),
        ]:
            SampleType.objects.get_or_create(code=code, defaults={"name": name, "collection_tube": tube, "storage_temp": temp, "retention_days": retain})
        sample_types = list(SampleType.objects.all())
        for st in sample_types:
            self.stdout.write(f"  +  {st.code}: {st.name}")

        # 5. TEST PANELS
        self.stdout.write("\n[5/11] Creating test panels...")
        for code in ["NIPT", "NIPT_PLUS", "HPV"]:
            for site_code, site in sites.items():
                data = {
                    "NIPT": {"name": "NIPT - Non-Invasive Prenatal Testing", "desc": "Screening for T21, T18, T13 aneuploidies from maternal cfDNA", "tat": 7},
                    "NIPT_PLUS": {"name": "NIPT+ - Extended Prenatal Screening", "desc": "NIPT plus microdeletions (22q11.2, 1p36), sex chromosome aneuploidies", "tat": 10},
                    "HPV": {"name": "HPV - High-Risk Genotyping", "desc": "Detection of 14 high-risk HPV types", "tat": 5},
                }[code]
                TestPanel.objects.get_or_create(
                    code=code, site=site, defaults={
                        "name": data["name"], "description": data["desc"],
                        "turnaround_days": data["tat"], "report_template_code": f"{code.lower()}_v1_en",
                    }
                )
        self.stdout.write(f"  +  {TestPanel.objects.count()} test panels across all sites")

        # 6. INSTRUMENTS
        self.stdout.write("\n[6/11] Creating instruments...")
        us_site = sites["US-LA"]
        for name, itype, mfr, model, serial, status, loc in [
            ("NovaSeq 6000 S4", "SEQUENCER", "Illumina", "NovaSeq 6000", "NS-6000-42", "ACTIVE", "Sequencing Bay A"),
            ("NextSeq 550", "SEQUENCER", "Illumina", "NextSeq 550", "NX-550-17", "ACTIVE", "Sequencing Bay B"),
            ("Qubit 4", "FLUOROMETER", "Thermo Fisher", "Qubit 4", "QB4-0089", "ACTIVE", "Quant Station"),
            ("TapeStation 4200", "ELECTROPHORESIS", "Agilent", "TapeStation 4200", "TS-4200-33", "ACTIVE", "QC Station"),
            ("KingFisher Flex", "EXTRACTOR", "Thermo Fisher", "KingFisher Flex", "KF-FL-12", "ACTIVE", "Extraction Bay"),
            ("CFX96 qPCR", "THERMOCYCLER", "Bio-Rad", "CFX96 Touch", "CF96-T-05", "ACTIVE", "Quant Station"),
            ("BiOMEK i5", "LIQUID_HANDLER", "Beckman Coulter", "BiOMEK i5 Span-8", "BM-i5-201", "MAINTENANCE", "Liquid Handler Bay"),
        ]:
            inst, created = Instrument.objects.get_or_create(
                serial_number=serial, site=us_site, defaults={
                    "name": name, "instrument_type": itype, "manufacturer": mfr,
                    "model": model, "status": status, "location": loc,
                }
            )
            # '+' = new, '=' = existed
            self.stdout.write(f"  {'+' if created else '='}  {inst.name} ({inst.status})")

        nova_seq = Instrument.objects.get(serial_number="NS-6000-42")
        next_seq = Instrument.objects.get(serial_number="NX-550-17")

        # 7. REAGENTS & LOTS
        self.stdout.write("\n[7/11] Creating reagents and lots...")
        for name, cat, mfr, rtype in [
            ("KAPA HyperPrep Kit", "KR1145", "Roche", "KIT"),
            ("QIAamp MinElute ccfDNA", "217204", "Qiagen", "KIT"),
            ("IDT xGen UDI Adaptors", "100-xgen-udi", "IDT", "PRIMER"),
            ("Qubit dsDNA HS Assay", "Q32854", "Thermo Fisher", "KIT"),
            ("KAPA Library Quant Kit", "KK4854", "Roche", "KIT"),
            ("NextSeq Reagent Kit v2.5", "20024906", "Illumina", "KIT"),
            ("Agilent HS D1000 Screentape", "5067-5584", "Agilent", "CONSUMABLE"),
        ]:
            reagent, _ = Reagent.objects.get_or_create(catalog_number=cat, site=us_site, defaults={"name": name, "manufacturer": mfr, "reagent_type": rtype})
            for j in range(random.randint(1, 2)):
                lot_num = f"{reagent.catalog_number[:4]}-{random.randint(1000, 9999)}"
                expiry = date.today() + timedelta(days=random.randint(30, 730))
                quality = "IN_USE" if j == 0 else "QC_PASSED"
                lot, created = ReagentLot.objects.get_or_create(
                    reagent=reagent, lot_number=lot_num, defaults={
                        "received_date": date.today() - timedelta(days=random.randint(5, 90)),
                        "expiry_date": expiry, "quantity_received": random.randint(10, 250),
                        "unit": "reactions" if reagent.reagent_type == "KIT" else "units",
                        "quality_status": quality, "storage_location": f"Fridge {random.randint(1,4)}",
                    }
                )
                if created:
                    InventoryTransaction.objects.create(lot=lot, transaction_type="RECEIVED", quantity=lot.quantity_received, unit=lot.unit, performed_by=admin)
                    self.stdout.write(f"  +  {reagent.name} Lot {lot_num} ({quality})")

        # 8. SAMPLES (30 samples)
        self.stdout.write("\n[8/11] Creating 30 samples...")
        names = ["Maria Garcia", "James Smith", "Wei Wang", "Sarah Johnson", "Carlos Silva", "Anna Mueller",
                  "Takeshi Tanaka", "Priya Patel", "Elena Kowalski", "David Brown", "Fatima Al-Rashid",
                  "Michael Davis", "Yuki Nakamura", "Roberto Costa", "Sophie Laurent", "Chen Liu",
                  "Isabella Rossi", "John Wilson", "Ming Zhang", "Lakshmi Sharma"]
        physicians = ["Dr. Emily Carter", "Dr. Robert Chen", "Dr. Ana Santos", "Dr. James Park"]
        facilities = ["OB-GYN Associates", "City Womens Clinic", "Precision Genetics Center", "Pacific Medical Group"]

        status_dist = ["RECEIVED"]*8 + ["ACCEPTED"]*5 + ["IN_PROCESS"]*5 + ["COMPLETED"]*4 + ["REPORTED"]*6 + ["REJECTED"]*2
        tech_user = User.objects.filter(username="usla_tech").first() or admin

        created_samples = []
        now = timezone.now()
        for i in range(30):
            panel_code = ["NIPT", "NIPT_PLUS", "HPV"][i % 3]
            st = sample_types[0] if panel_code != "HPV" else sample_types[1]
            status = status_dist[i]
            days_ago = random.randint(0, 14)
            rcpt_date = (now - timedelta(days=days_ago)).date()
            coll_date = rcpt_date - timedelta(days=random.randint(0, 5))

            barcode = f"{panel_code[:4].upper()}-2026-{i+1:04d}"
            sample, created = Sample.objects.get_or_create(
                sample_id=barcode,
                defaults={
                    "sample_type": st,
                    "patient_id": f"PT-{2026000 + i + 1}",
                    "patient_name": names[i % len(names)],
                    "patient_dob": date(1980 + (i % 20), (i % 12) + 1, (i % 28) + 1),
                    "patient_sex": "F",
                    "ordering_physician": physicians[i % 4],
                    "ordering_facility": facilities[i % 4],
                    "collection_date": coll_date,
                    "collection_time": f"{8 + (i % 8):02d}:{(i * 7) % 60:02d}",
                    "receipt_date": rcpt_date,
                    "receipt_time": f"{9 + (i % 8):02d}:{(i * 13) % 60:02d}",
                    "receipt_temp": "4C",
                    "transport_time_days": round(0.5 + random.random() * 2.5, 1),
                    "status": status,
                    "rejection_reason": "HEMOLYZED" if status == "REJECTED" else "",
                    "consent_given": True,
                    "consent_date": coll_date,
                    "site": us_site,
                    "created_by": tech_user,
                }
            )
            if created:
                created_samples.append(sample)

        self.stdout.write(f"  +  {len(created_samples)} new samples (total: {Sample.objects.filter(site=us_site).count()})")
        for st in ["RECEIVED", "ACCEPTED", "IN_PROCESS", "COMPLETED", "REPORTED", "REJECTED"]:
            cnt = Sample.objects.filter(site=us_site, status=st).count()
            if cnt:
                self.stdout.write(f"     {st}: {cnt}")

        # 9. SEQUENCING RUNS
        self.stdout.write("\n[9/11] Creating sequencing runs...")
        run_statuses = ["PLANNED", "LIBRARY_PREP", "SEQUENCING", "ANALYZING", "QC_REVIEW", "COMPLETED"]
        us_panel = TestPanel.objects.filter(code="NIPT", site=us_site).first()

        for rn, run_status in enumerate(run_statuses):
            panel_code = ["NIPT_PLUS", "HPV", "NIPT_PLUS", "NIPT", "NIPT", "NIPT_PLUS"][rn]
            panel = TestPanel.objects.filter(code=panel_code, site=us_site).first() or us_panel
            sequencer = nova_seq if rn < 3 else next_seq
            run, created = SampleRun.objects.get_or_create(
                run_number=f"{panel_code}-2026-04-{rn+1:03d}",
                site=us_site,
                defaults={
                    "panel": panel, "sequencer": sequencer, "status": run_status,
                    "planned_date": date.today() + timedelta(days=rn),
                    "operator": tech_user,
                }
            )
            if created:
                count = min(random.randint(6, 12), len(created_samples))
                for j in range(count):
                    sample = created_samples[j]
                    row = chr(65 + j // 12)
                    col = (j % 12) + 1
                    RunSample.objects.create(
                        run=run, sample=sample,
                        well_position=f"{row}{col:02d}",
                        index_sequence=f"N7{random.randint(1,12):02d}+S5{random.randint(1,12):02d}",
                        status="ANALYZED" if run_status == "COMPLETED" else "QUEUED",
                    )
                self.stdout.write(f"  +  {run.run_number}: {count} samples ({run_status})")
            else:
                self.stdout.write(f"  =  {run.run_number} ({run.status})")

        # 10. REPORT TEMPLATES
        self.stdout.write("\n[10/11] Creating report templates...")
        for site_code, site in sites.items():
            for panel_code in ["NIPT", "NIPT_PLUS", "HPV"]:
                panel = TestPanel.objects.filter(code=panel_code, site=site).first()
                for lang in ["en", "zh"]:
                    tmpl_code = f"{panel_code.lower()}_v1_{lang}"
                    if not ReportTemplate.objects.filter(panel=panel, code=tmpl_code).exists():
                        ReportTemplate.objects.create(
                            panel=panel, code=tmpl_code, language=lang,
                            name=f"{panel_code} Report ({lang.upper()})",
                            template_content={"title": panel_code, "version": 1}
                        )
        self.stdout.write(f"  +  {ReportTemplate.objects.count()} report templates")

        # 11. QC CONTROL MATERIALS AND CHARTS
        self.stdout.write("\n[11/12] Creating QC control materials and charts...")
        from decimal import Decimal

        # QC Control Materials (3 different lots for NIPT panel)
        nipt_panel = TestPanel.objects.filter(code="NIPT", site=us_site).first()

        materials_data = [
            {
                "name": "NIPT Positive Control",
                "type": "POSITIVE",
                "mfr": "Roche",
                "cat": "NIPT-CTRL-POS",
                "lot": "LOT-2026-001",
                "targets": {"fetal_fraction": {"mean": 12.0, "sd": 1.5}, "q30": {"mean": 89.0, "sd": 2.0}},
                "expiry": date.today() + timedelta(days=365),
            },
            {
                "name": "NIPT Negative Control",
                "type": "NEGATIVE",
                "mfr": "Roche",
                "cat": "NIPT-CTRL-NEG",
                "lot": "LOT-2026-002",
                "targets": {"fetal_fraction": {"mean": 0.0, "sd": 0.1}, "q30": {"mean": 90.0, "sd": 1.8}},
                "expiry": date.today() + timedelta(days=300),
            },
            {
                "name": "NIPT Positive Control",
                "type": "POSITIVE",
                "mfr": "Roche",
                "cat": "NIPT-CTRL-POS",
                "lot": "LOT-2025-015",
                "targets": {"fetal_fraction": {"mean": 11.5, "sd": 1.3}, "q30": {"mean": 88.5, "sd": 2.2}},
                "expiry": date.today() + timedelta(days=180),
            },
        ]

        created_materials = []
        for md in materials_data:
            mat, created = QCControlMaterial.objects.get_or_create(
                lot_number=md["lot"],
                site=us_site,
                defaults={
                    "name": md["name"],
                    "material_type": md["type"],
                    "manufacturer": md["mfr"],
                    "catalog_number": md["cat"],
                    "target_values": md["targets"],
                    "expiry_date": md["expiry"],
                },
            )
            created_materials.append(mat)
            self.stdout.write(f"  {'+' if created else '='}  {mat.name} (Lot {mat.lot_number}, {mat.material_type})")

        # QC Charts (L-J charts for each metric)
        charts_data = [
            {
                "metric": "fetal_fraction",
                "ctrl": created_materials[0],
                "mean": Decimal("12.0"),
                "sd": Decimal("1.5"),
                "rules": ["1-2s", "1-3s", "2-2s", "R-4s"],
            },
            {
                "metric": "q30",
                "ctrl": created_materials[0],
                "mean": Decimal("89.0"),
                "sd": Decimal("2.0"),
                "rules": ["1-2s", "1-3s", "R-4s"],
            },
            {
                "metric": "fetal_fraction",
                "ctrl": created_materials[1],
                "mean": Decimal("0.0"),
                "sd": Decimal("0.1"),
                "rules": ["1-2s", "1-3s", "2-2s"],
            },
            {
                "metric": "fetal_fraction",
                "ctrl": created_materials[2],
                "mean": Decimal("11.5"),
                "sd": Decimal("1.3"),
                "rules": ["1-2s", "1-3s", "2-2s", "R-4s"],
            },
        ]

        created_charts = []
        for cd in charts_data:
            if not cd["ctrl"]:
                continue
            chart, created = QCChart.objects.get_or_create(
                metric_name=cd["metric"],
                control_material=cd["ctrl"],
                target_mean=cd["mean"],
                site=us_site,
                panel=nipt_panel or TestPanel.objects.filter(site=us_site).first(),
                defaults={
                    "target_sd": cd["sd"],
                    "warning_sd": Decimal("2"),
                    "action_sd": Decimal("3"),
                    "westgard_rules": cd["rules"],
                    "is_active": True,
                },
            )
            created_charts.append(chart)
            sd_pct = float(cd["sd"]) / float(cd["mean"]) * 100 if float(cd["mean"]) != 0 else float("inf")
            self.stdout.write(f"  {'+' if created else '='}  {chart.metric_name} chart (mean={cd['mean']}, SD={cd['sd']}, CV={sd_pct:.1f}%)")

        self.stdout.write(f"  Total: {len(created_materials)} control materials, {len(created_charts)} QC charts")

        # SUMMARY
        self.stdout.write("\n" + self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  Seed data loaded successfully!"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"\n  Sites:        {Site.objects.count()}")
        self.stdout.write(f"  Users:        {User.objects.count()}")
        self.stdout.write(f"  Roles:        {Role.objects.count()}")
        self.stdout.write(f"  Panels:       {TestPanel.objects.count()}")
        self.stdout.write(f"  Samples:      {Sample.objects.count()}")
        self.stdout.write(f"  Runs:         {SampleRun.objects.count()}")
        self.stdout.write(f"  Run Samples:  {RunSample.objects.count()}")
        self.stdout.write(f"  Instruments:  {Instrument.objects.count()}")
        self.stdout.write(f"  Reagent Lots: {ReagentLot.objects.count()}")
        self.stdout.write(f"  Report Templates: {ReportTemplate.objects.count()}")
        self.stdout.write(f"  QC Materials:   {QCControlMaterial.objects.count()}")
        self.stdout.write(f"  QC Charts:      {QCChart.objects.count()}")
        self.stdout.write(f"\n  Admin login:  admin / admin123")
        for code in sites:
            p = code.lower().replace("-", "")[:6]
            self.stdout.write(f"  {code} login:  {p}_site / site_director123")
