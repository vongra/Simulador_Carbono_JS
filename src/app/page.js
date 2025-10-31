import CarbonCycleSimulator from '@/components/CarbonCycleSimulator';

export const metadata = {
  title: 'Simulador do Ciclo Biogeoquímico do Carbono',
  description: 'Simulação interativa do ciclo do carbono com modelagem matemática precisa',
};

export default function Home() {
  return <CarbonCycleSimulator />;
}
